import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getIssueDetail,
  updateIssueStatus,
  getPresignedUpload,
  resolveIssue,
  downloadIssuePDF,
  getCurrentUser,
} from "../api";
import { Camera, ArrowLeft, Download, X, MapPin, Calendar, User, Building2, CheckCircle2, Clock, AlertCircle } from "lucide-react";

const IssueDetail = () => {

  const { trackingId } = useParams();
  const navigate = useNavigate();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageErrorDetails, setImageErrorDetails] = useState("");
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState("");

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [file, setFile] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    getIssueDetail(trackingId)
      .then((data) => {
        if (mounted) {
          console.log("Issue data received:", data);
          console.log("Image URL:", data.image_url);
          console.log("Image Presigned URL:", data.image_presigned_url);
          setIssue(data);
        }
      })
      .catch((err) => {
        console.error("Failed to load issue:", err);
        if (mounted) setError("Failed to load issue details");
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [trackingId]);

  useEffect(() => {
    if (issue?.image_presigned_url) {
      console.log("Setting up image load for:", issue.image_presigned_url);
      setImageLoading(true);
      setImageError(false);
      setImageErrorDetails("");
    }
  }, [issue?.image_presigned_url]);

  useEffect(() => {
    if (!showResolveModal) return;

    getCurrentUser()
      .then(setCurrentUser)
      .catch(() => alert("Failed to load user info"));
  }, [showResolveModal]);

  useEffect(() => {
    if (!showImagePreview) return;

    const onKeyDown = (e) => e.key === "Escape" && setShowImagePreview(false);
    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showImagePreview]);

  const handleImagePreview = (url) => {
    setPreviewImageUrl(url);
    setShowImagePreview(true);
  };

  const handleImageError = (e) => {
    console.error("Image failed to load:", e);
    console.error("Image src:", e.target.src);
    setImageError(true);
    setImageErrorDetails("Failed to load image from S3");
  };

  const handleDownloadPDF = async () => {
    try {
      const blob = await downloadIssuePDF(issue.tracking_id);
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `issue_${issue.tracking_id}.pdf`;
      document.body.appendChild(a);
      a.click();

      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download PDF");
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!issue || newStatus === issue.status) return;

    if (issue.status === "pending" && newStatus !== "in_progress") return;
    if (issue.status === "in_progress" && newStatus === "pending") return;
    if (issue.status === "escalated" && newStatus !== "resolved") return;

    if (newStatus === "resolved") {
      setShowResolveModal(true);
      return;
    }

    try {
      if (newStatus === "escalated") {
        await updateIssueStatus(issue.tracking_id, "escalated");
        navigate("/dashboard/issues");
        return;
      }

      const updated = await updateIssueStatus(issue.tracking_id, newStatus);
      setIssue((prev) => ({ ...prev, ...updated }));
    } catch (err) {
      alert(err.message || "Failed to update status");
    }
  };

  const handleResolve = async () => {
    if (!file) {
      alert("Please upload a completion image");
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Only image files are allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      return;
    }

    setResolving(true);
    try {
      const { url, key } = await getPresignedUpload(file);

      await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      await resolveIssue(issue.tracking_id, key);
      navigate("/dashboard/history");
    } catch {
      alert("Failed to resolve issue");
    } finally {
      setResolving(false);
      setShowResolveModal(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="h-12 w-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Loading issue details...</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
        <p className="text-red-800 text-center font-medium">{error}</p>
      </div>
    </div>
  );
  
  if (!issue) return null;

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "in_progress":
        return <AlertCircle className="w-4 h-4" />;
      case "escalated":
        return <AlertCircle className="w-4 h-4" />;
      case "resolved":
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return null;
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{issue.issue_title}</h1>
                <span
                  className={`px-3 py-1 inline-flex items-center gap-1.5 rounded-full text-xs font-semibold ${
                    issue.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : issue.status === "in_progress"
                      ? "bg-blue-100 text-blue-800"
                      : issue.status === "escalated"
                      ? "bg-red-100 text-red-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {getStatusIcon(issue.status)}
                  {issue.status.replace("_", " ").toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Tracking ID: <span className="font-mono font-medium text-gray-700">{issue.tracking_id}</span>
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 text-sm px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>

              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-sm px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Department</p>
                <p className="text-sm font-semibold text-gray-900">{issue.department}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Location</p>
                <p className="text-sm font-semibold text-gray-900">{issue.location}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Reported On</p>
                <p className="text-sm font-semibold text-gray-900">{new Date(issue.issue_date).toLocaleString()}</p>
              </div>
            </div>

            {issue.status !== "resolved" && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1.5">Update Status</p>
                  <select
                    disabled={showResolveModal}
                    value={issue.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="pending" disabled={issue.status !== "pending"}>
                      Pending
                    </option>
                    <option value="in_progress" disabled={issue.status !== "pending"}>
                      In Progress
                    </option>
                    <option value="escalated" disabled={issue.status !== "in_progress"}>
                      Escalated
                    </option>
                    <option value="resolved" disabled={!["in_progress", "escalated"].includes(issue.status)}>
                      Resolved
                    </option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Debug Info */}
        {imageError && imageErrorDetails && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-800 mb-1">Image Load Error</p>
                <p className="text-sm text-red-700 mb-2">{imageErrorDetails}</p>
                <div className="text-xs text-red-600 space-y-1">
                  <div>Image URL: {issue.image_url || 'null'}</div>
                  <div className="break-all">Presigned URL: {issue.image_presigned_url || 'null'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Description Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full flex flex-col">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                Issue Description
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex-1 overflow-y-auto">
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                  {issue.issue_description}
                </p>
              </div>
            </div>
          </div>

          {/* Issue Image Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full flex flex-col">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                Issue Image
              </h2>
              <div className="bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden aspect-[4/3] flex-1">
                {issue.image_presigned_url && !imageError ? (
                  <>
                    {imageLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white">
                        <div className="h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                      </div>
                    )}
                    <img
                      src={issue.image_presigned_url}
                      alt="Issue"
                      onClick={() => handleImagePreview(issue.image_presigned_url)}
                      onLoad={() => {
                        console.log("Image loaded successfully");
                        setImageLoading(false);
                      }}
                      onError={handleImageError}
                      className="w-full h-full object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                    />
                  </>
                ) : (
                  <div className="flex flex-col items-center text-gray-400 p-6">
                    <Camera className="w-12 h-12 mb-2" />
                    <span className="text-sm font-medium">
                      {imageError ? "Failed to load image" : "No image available"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Proof of Work Section */}
        {issue.status === "resolved" && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-6 bg-green-600 rounded-full"></div>
              <h2 className="text-lg font-bold text-gray-900">Proof of Work</h2>
              <span className="ml-auto px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                VERIFIED
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Completion Image */}
              <div className="lg:col-span-1">
                <div className="bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden aspect-[4/3]">
                  {issue.completion_presigned_url || issue.completion_url ? (
                    <img
                      src={issue.completion_presigned_url || issue.completion_url}
                      alt="Completion proof"
                      onClick={() => handleImagePreview(issue.completion_presigned_url || issue.completion_url)}
                      className="w-full h-full object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400 p-6">
                      <Camera className="w-12 h-12 mb-2" />
                      <span className="text-sm font-medium">No completion image</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Resolution Details */}
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Tracking ID</p>
                    <p className="text-sm font-mono font-semibold text-gray-900">{issue.tracking_id}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Department</p>
                    <p className="text-sm font-semibold text-gray-900">{issue.department}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Resolved On</p>
                    <p className="text-sm font-semibold text-gray-900">{new Date(issue.updated_at).toLocaleString()}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Resolved By</p>
                    <p className="text-sm font-semibold text-gray-900">{issue.allocated_to}</p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs text-blue-800 leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 inline mr-1.5" />
                    This issue was successfully resolved after on-site verification and submission of photographic proof.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image Preview Modal */}
        {showImagePreview && (
          <div 
            className="fixed inset-0 bg-black z-50 flex items-center justify-center"
            onClick={() => setShowImagePreview(false)}
          >
            <button
              onClick={() => setShowImagePreview(false)}
              className="absolute top-6 right-6 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2 backdrop-blur-sm transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div 
              className="relative flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewImageUrl}
                alt="Preview"
                style={{ width: '65vw', height: '65vh' }}
                className="object-contain rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Resolve Modal */}
        {showResolveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
              
              {/* Modal Header */}
              <div className="border-b border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900">Submit Proof of Work</h2>
                <p className="text-sm text-gray-500 mt-1">Upload completion image to resolve this issue</p>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Assigned To</label>
                  <input
                    readOnly
                    disabled
                    value={currentUser ? `${currentUser.full_name} (ID: ${currentUser.userid})` : ""}
                    className="w-full border border-gray-300 px-3 py-2 bg-gray-50 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Completion Date</label>
                  <input
                    readOnly
                    disabled
                    value={new Date().toLocaleString()}
                    className="w-full border border-gray-300 px-3 py-2 bg-gray-50 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Department</label>
                  <input
                    readOnly
                    disabled
                    value={currentUser?.department || ""}
                    className="w-full border border-gray-300 px-3 py-2 bg-gray-50 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Completion Image *</label>
                  <input
                    id="completion-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files[0])}
                  />

                  <label
                    htmlFor="completion-upload"
                    className="flex items-center justify-center gap-2 w-full cursor-pointer px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <Camera className="w-5 h-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      {file ? "Change Image" : "Choose Image"}
                    </span>
                  </label>

                  {file && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-600 mb-2">
                        Selected: <span className="font-semibold">{file.name}</span>
                      </p>
                      <img
                        src={URL.createObjectURL(file)}
                        alt="Preview"
                        className="w-full h-40 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowResolveModal(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>

                <button
                  onClick={handleResolve}
                  disabled={resolving || !file}
                  className={`px-6 py-2.5 rounded-lg text-white font-medium transition-colors ${
                    resolving || !file
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {resolving ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    "Submit Proof"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default IssueDetail;