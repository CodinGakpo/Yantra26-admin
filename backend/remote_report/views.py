from django.utils import timezone
from datetime import timedelta
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import IssueReportRemote
from .serializers import IssueReportSerializer
from rest_framework import status
from django.conf import settings
import boto3
from urllib.parse import urlparse, unquote
from django.utils import timezone
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import HexColor
from django.http import HttpResponse
from io import BytesIO
import requests
import os

#To generate Report PDF
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Image,
    Table,
    TableStyle,
)

class IssueListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        status = request.GET.get("status")

        # Auto-escalate stale in_progress issues
        self._auto_escalate_stale_issues(user.department)

        issues = IssueReportRemote.objects.filter(
            department=user.department
        )

        if status:
            issues = issues.filter(status=status)
        else:
            issues = issues.filter(status__in = ["pending","in_progress"])

        issues = issues.order_by("-issue_date")

        serializer = IssueReportSerializer(issues, many=True)
        return Response(serializer.data)
    
    def _auto_escalate_stale_issues(self, department):
        """Auto-escalate in_progress issues not updated for 3 days"""
        three_days_ago = timezone.now() - timedelta(days=3)
        
        stale_issues = IssueReportRemote.objects.filter(
            department=department,
            status="in_progress",
            updated_at__lt=three_days_ago
        )
        
        for issue in stale_issues:
            issue.status = "escalated"
            issue.auto_escalated = True
            issue.updated_at = timezone.now()
            issue.save(update_fields=["status", "auto_escalated", "updated_at"])
    
class IssueDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, tracking_id):
        try:
            issue = IssueReportRemote.objects.get(tracking_id=tracking_id)
        except IssueReportRemote.DoesNotExist:
            raise NotFound("Issue not found")

        # Department-level access control
        if issue.department != request.user.department:
            raise PermissionDenied("You do not have access to this issue")

        data = IssueReportSerializer(issue).data

        data["image_presigned_url"] = (
            generate_presigned_get(data["image_url"])
            if data.get("image_url")
            else None
        )

        data["completion_presigned_url"] = (
            generate_presigned_get(data["completion_url"])
            if data.get("completion_url")
            else None
        )


        return Response(data)


class IssueStatusUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, tracking_id):
        issue = get_object_or_404(IssueReportRemote, tracking_id=tracking_id)
        new_status = request.data.get("status")

        if new_status not in ["pending", "in_progress", "escalated", "resolved"]:
            return Response(
                {"detail": "Invalid status"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        current = issue.status

        # ---- STATE MACHINE ----
        if current == "pending":
            if new_status != "in_progress":
                return Response(
                    {"detail": "Pending can only move to In Progress"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            issue.allocated_to = str(request.user.userid)

        elif current == "in_progress":
            if new_status not in ["escalated", "resolved"]:
                return Response(
                    {"detail": "In Progress can only move to Escalated or Resolved"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        elif current in ["escalated", "resolved"]:
            return Response(
                {"detail": f"{current} issues cannot change status"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        issue.status = new_status
        issue.updated_at = timezone.now()
        issue.save()

        return Response(
            {"status": issue.status, "allocated_to": issue.allocated_to}
        )


class IssueResolveView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, tracking_id):
        try:
            issue = IssueReportRemote.objects.get(tracking_id=tracking_id)
        except IssueReportRemote.DoesNotExist:
            raise ValidationError("Issue not found")

        # Department / root permission
        if issue.department != request.user.department and not request.user.is_root:
            raise PermissionDenied("Access denied")

        if issue.status == "resolved":
            raise ValidationError("Issue already resolved")

        completion_key = request.data.get("completion_key")
        if not completion_key:
            raise ValidationError("completion_key is required")

        bucket = settings.AWS_STORAGE_BUCKET_NAME
        if not bucket:
            raise ValidationError("S3 bucket not configured")

        

        # 🔒 Server-authoritative resolution
        issue.status = "resolved"
        issue.completion_url = completion_key
        issue.updated_at = timezone.now()

        issue.save(update_fields=["status", "completion_url", "updated_at"])

        return Response(
            {
                "message": "Issue resolved successfully",
                "resolved_by": request.user.full_name,
                "department": request.user.department,
                "resolved_at": issue.updated_at,
            },
            status=status.HTTP_200_OK,
        )



def extract_s3_key(value: str) -> str:
    """
    Accepts either:
    - raw S3 key: reports/6/file.jpg
    - full S3 URL (encoded or not)

    Returns:
    - clean S3 object key
    """
    if not value:
        return None

    # Case 1: Already a key
    if not value.startswith("http"):
        return value

    # Case 2: Full S3 URL
    parsed = urlparse(value)

    # Remove leading slash and decode %2F etc
    return unquote(parsed.path.lstrip("/"))
def get_s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=(
            getattr(settings, "AWS_REGION", None)
            or getattr(settings, "AWS_S3_REGION_NAME", None)
            or "ap-south-1"
        ),
    )


def generate_presigned_get(value, expires_in=300):
    key = extract_s3_key(value)
    if not key:
        return None

    bucket_name = (
        getattr(settings, "REPORT_IMAGES_BUCKET", None)
        or getattr(settings, "AWS_STORAGE_BUCKET_NAME", None)
    )

    if not bucket_name:
        raise RuntimeError("No S3 bucket configured")

    s3 = get_s3_client()

    return s3.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": bucket_name,
            "Key": key,
        },
        ExpiresIn=expires_in,
    )

def draw_header_footer(canvas, doc):
    canvas.saveState()

    PAGE_WIDTH, PAGE_HEIGHT = A4
    HEADER_HEIGHT = 70
    header_y = PAGE_HEIGHT - HEADER_HEIGHT

    #Header Bg
    canvas.setFillColor(colors.black)
    canvas.rect(0, header_y, PAGE_WIDTH, HEADER_HEIGHT, stroke=0, fill=1)

    #Logo
    assets_path = os.path.join(os.path.dirname(__file__), "..", "assets")
    logo_path = os.path.join(assets_path, "logo-1.png")

    try:
        canvas.drawImage(
            logo_path,
            40,
            header_y + 20,
            width=35,
            height=35,
            preserveAspectRatio=True,
            mask="auto",
        )
    except Exception:
        pass

    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 18)
    canvas.drawString(85, header_y + 38, "ReportMitra")

    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(HexColor("#D1D5DB"))
    canvas.drawString(85, header_y + 22, "CIVIC | CONNECT | RESOLVE")

    #DocTitle
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 12)
    text = "Issue Field Briefing Report"
    text_width = canvas.stringWidth(text, "Helvetica-Bold", 12)
    canvas.drawString(PAGE_WIDTH - text_width - 40, header_y + 32, text)

    #Footer
    canvas.setFillColor(HexColor("#6B7280"))
    canvas.setFont("Helvetica", 8)
    canvas.drawString(40, 35, f"Page {doc.page}")
    
    footer_text = "Generated from ReportMitra Admin Portal"
    footer_width = canvas.stringWidth(footer_text, "Helvetica", 8)
    canvas.drawString(PAGE_WIDTH - footer_width - 40, 35, footer_text)

    canvas.restoreState()

class IssuePDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, tracking_id):
        try:
            issue = IssueReportRemote.objects.get(tracking_id=tracking_id)
        except IssueReportRemote.DoesNotExist:
            raise NotFound("Issue not found")

        if issue.department != request.user.department:
            raise PermissionDenied("Access denied")

        buffer = BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=40,
            leftMargin=40,
            topMargin=90,
            bottomMargin=65,
        )

        section_header = ParagraphStyle(
            "SectionHeader",
            fontSize=13,
            fontName="Helvetica-Bold",
            textColor=colors.black,
            spaceBefore=18,
            spaceAfter=10,
            leftIndent=0,
        )

        body_text = ParagraphStyle(
            "BodyText",
            fontSize=10,
            leading=14,
            textColor=HexColor("#374151"),
        )

        subtitle = ParagraphStyle(
            "Subtitle",
            fontSize=9,
            textColor=HexColor("#6B7280"),
            spaceAfter=16,
            leading=13,
        )

        story = []

        story.append(
            Paragraph(
                "This document assists on-site municipal workers with issue verification, "
                "safety assessment, and resolution procedures.",
                subtitle,
            )
        )

        status_colors = {
            "pending": ("#FEF3C7", "#92400E"),
            "in_progress": ("#DBEAFE", "#1E40AF"),
            "escalated": ("#FEE2E2", "#991B1B"),
            "resolved": ("#D1FAE5", "#065F46"),
        }
        bg_color, text_color = status_colors.get(
            issue.status, ("#F3F4F6", "#1F2937")
        )

        story.append(Paragraph("Issue Overview", section_header))

        overview_data = [
            [
                Paragraph("<b>Tracking ID</b>", body_text),
                Paragraph(issue.tracking_id, body_text),
            ],
            [
                Paragraph("<b>Status</b>", body_text),
                Paragraph(
                    f'<para backColor="{bg_color}" textColor="{text_color}" '
                    f'fontSize="9" fontName="Helvetica-Bold">'
                    f'&nbsp;&nbsp;{issue.status.upper()}&nbsp;&nbsp;</para>',
                    body_text,
                ),
            ],
            [
                Paragraph("<b>Department</b>", body_text),
                Paragraph(issue.department, body_text),
            ],
            [
                Paragraph("<b>Location</b>", body_text),
                Paragraph(issue.location, body_text),
            ],
            [
                Paragraph("<b>Reported On</b>", body_text),
                Paragraph(
                    issue.issue_date.strftime("%d %B %Y, %I:%M %p"), body_text
                ),
            ],
        ]

        overview_table = Table(overview_data, colWidths=[130, 355])
        overview_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, -1), HexColor("#F9FAFB")),
                    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#E5E7EB")),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 12),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        story.append(overview_table)
        story.append(Spacer(1, 16))

        story.append(Paragraph("Issue Title", section_header))
        title_box = Table(
            [[Paragraph(issue.issue_title, body_text)]], colWidths=[485]
        )
        title_box.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), HexColor("#F9FAFB")),
                    ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#E5E7EB")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 12),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                    ("TOPPADDING", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ]
            )
        )
        story.append(title_box)

        story.append(Paragraph("Issue Description", section_header))
        desc_box = Table(
            [[Paragraph(issue.issue_description.replace("\n", "<br/>"), body_text)]],
            colWidths=[485],
        )
        desc_box.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), HexColor("#F9FAFB")),
                    ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#E5E7EB")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 12),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                    ("TOPPADDING", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ]
            )
        )
        story.append(desc_box)

        story.append(Paragraph("Issue Image (On-site Reference)", section_header))

        if issue.image_url:
            try:
                presigned_url = generate_presigned_get(issue.image_url)
                img_resp = requests.get(presigned_url, timeout=5)
                img_resp.raise_for_status()

                img = Image(
                    BytesIO(img_resp.content),
                    width=4.5 * inch,
                    height=3 * inch,
                    kind="proportional",
                )

                img_table = Table([[img]], colWidths=[485])
                img_table.setStyle(
                    TableStyle(
                        [
                            ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#E5E7EB")),
                            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                            ("LEFTPADDING", (0, 0), (-1, -1), 10),
                            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                            ("TOPPADDING", (0, 0), (-1, -1), 10),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                            ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                        ]
                    )
                )
                story.append(img_table)
            except Exception as e:
                error_box = Table(
                    [[Paragraph("Image unavailable", body_text)]], colWidths=[485]
                )
                error_box.setStyle(
                    TableStyle(
                        [
                            ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#E5E7EB")),
                            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                            ("LEFTPADDING", (0, 0), (-1, -1), 12),
                            ("TOPPADDING", (0, 0), (-1, -1), 20),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 20),
                        ]
                    )
                )
                story.append(error_box)
        else:
            no_img_box = Table(
                [[Paragraph("No image attached", body_text)]], colWidths=[485]
            )
            no_img_box.setStyle(
                TableStyle(
                    [
                        ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#E5E7EB")),
                        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 12),
                        ("TOPPADDING", (0, 0), (-1, -1), 20),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 20),
                    ]
                )
            )
            story.append(no_img_box)

        story.append(Paragraph("Allocated To (Fill On-Site)", section_header))

        allocation_box = Table(
            [[""], [""], [""]],
            colWidths=[485],
            rowHeights=[25, 25, 25],
        )
        allocation_box.setStyle(
            TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 1, colors.black),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, HexColor("#D1D5DB")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        story.append(allocation_box)

        #QR Code
        story.append(Paragraph("Quick Access QR Code", section_header))

        qr_url = f"https://reportmitra.in/admin/issues/{issue.tracking_id}"
        qr_code = qr.QrCodeWidget(qr_url)
        bounds = qr_code.getBounds()
        width = bounds[2] - bounds[0]
        height = bounds[3] - bounds[1]
        d = Drawing(100, 100, transform=[100.0 / width, 0, 0, 100.0 / height, 0, 0])
        d.add(qr_code)

        qr_table = Table([[d]], colWidths=[485])
        qr_table.setStyle(
            TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#E5E7EB")),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 15),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 15),
                ]
            )
        )
        story.append(qr_table)

        story.append(Spacer(1, 8))
        story.append(
            Paragraph(
                "<i>Scan to view issue details on ReportMitra Admin Portal</i>",
                ParagraphStyle(
                    "QRCaption",
                    fontSize=9,
                    textColor=HexColor("#6B7280"),
                    alignment=1,
                ),
            )
        )

        #Document Authenticity
        story.append(Spacer(1, 25))
        auth_box = Table(
            [
                [
                    Paragraph(
                        "<b>Official Document</b><br/>"
                        "This is an official municipal record generated digitally "
                        "by ReportMitra Admin Portal.",
                        ParagraphStyle(
                            "Auth",
                            fontSize=9,
                            textColor=HexColor("#374151"),
                            leading=12,
                        ),
                    )
                ]
            ],
            colWidths=[485],
        )
        auth_box.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), HexColor("#F3F4F6")),
                    ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#D1D5DB")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 12),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                    ("TOPPADDING", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ]
            )
        )
        story.append(auth_box)

        #Build PDF
        doc.build(
            story,
            onFirstPage=draw_header_footer,
            onLaterPages=draw_header_footer,
        )

        buffer.seek(0)

        response = HttpResponse(buffer, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="issue_{issue.tracking_id}.pdf"'
        )
        return response