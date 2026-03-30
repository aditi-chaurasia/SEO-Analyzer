import { useState } from "react";
import axios from "axios";
import "./App.css";

export default function App() {
  const [url, setUrl] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [expandedImages, setExpandedImages] = useState(false);
  const [expandedLinks, setExpandedLinks] = useState(false);
  const [logs, setLogs] = useState([]);
  const [es, setEs] = useState(null);

  const analyzeSEO = async () => {
    if (!url) return alert("Enter URL");
    if (!geminiKey) return alert("Enter Gemini API Key");

    try {
      setLoading(true);
      setError("");
      setResult(null);
      setLogs([]);

      // open SSE connection for live logs if not already open
      if (!es) {
        try {
             const source = new EventSource('https://seo-analyzer-6.onrender.com/events');          source.onmessage = (e) => {
            try {
              const payload = JSON.parse(e.data);
              setLogs((l) => [...l, payload.message]);
            } catch (err) {
              setLogs((l) => [...l, e.data]);
            }
          };
          source.onerror = () => {
            source.close();
            setEs(null);
          };
          setEs(source);
        } catch (err) {
          console.warn('SSE not available', err);
        }
      }

      const res = await axios.post("https://seo-analyzer-6.onrender.com/analyze", { url, geminiKey });

      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>🚀 SEO Analyzer</h1>

      <div className="input-group">
        <input
          type="text"
          placeholder="Enter website URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <input
          type="password"
          placeholder="Enter Gemini API Key..."
          value={geminiKey}
          onChange={(e) => setGeminiKey(e.target.value)}
        />
        <button onClick={analyzeSEO}>
          {loading ? "⏳ Analyzing..." : "🔍 Analyze"}
        </button>
      </div>

      {error && <div className="error">⚠️ {error}</div>}

      {/* Live logs panel */}
      {logs.length > 0 && (
        <div className="logs">
          {logs.map((l, i) => (
            <div key={i} className="log-line">{l}</div>
          ))}
        </div>
      )}

      {result && (
        <div className="card">
          <h2>✨ Results</h2>

          <div className="score">
            SEO Score: <span>{result.score}/100</span>
          </div>

          <ul>
            <li><b>Title:</b> {result.seoData?.title || "Missing"}</li>
            <li><b>Description:</b> {result.seoData?.description || "Missing"}</li>
            <li><b>Word Count:</b> {result.seoData?.wordCount}</li>
            <li><b>H1:</b> {result.seoData?.h1Count}</li>
            <li><b>Images:</b> {result.seoData?.totalImages || result.seoData?.images}</li>
            <li><b>Missing ALT:</b> {result.seoData?.totalImagesWithoutAlt || result.seoData?.missingAlt}</li>
            <li><b>HTTPS:</b> {result.seoData?.https ? "✅ Yes" : "❌ No"}</li>
          </ul>

          {result.totalLinksScanned && (
            <div className="scan-info">
              <p>📊 Scanned entire website - Total links checked: <strong>{result.totalLinksScanned}</strong></p>
            </div>
          )}


          <h3>�️ Images</h3>
          {result.imagesWithoutAlt?.length ? (
            <div className="images-section">
              <div className="images-header" onClick={() => setExpandedImages(!expandedImages)}>
                <p className="warning-text">⚠️ {result.imagesWithoutAlt.length} images missing ALT text</p>
                <span className={`arrow ${expandedImages ? "expanded" : ""}`}>▶</span>
              </div>
              
              {expandedImages && (
                <table className="images-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Thumbnail</th>
                      <th>Image URL</th>
                      <th>Current ALT</th>
                      <th>Suggested ALT</th>
                      <th>Page</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.imagesWithoutAlt.map((img, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>
                          <img 
                            src={img.src} 
                            alt="preview" 
                            className="image-preview"
                            onError={(e) => e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect fill='%23ccc' width='80' height='80'/%3E%3Ctext x='50%' y='50%' text-anchor='middle' dy='.3em' fill='%23999' font-size='12'%3ENo Image%3C/text%3E%3C/svg%3E"}
                          />
                        </td>
                        <td className="url-cell">{img.src}</td>
                        <td>{img.alt || <span style={{color: '#f87171'}}>None</span>}</td>
                        <td className="suggested-alt">{img.suggestedAlt}</td>
                        <td>{img.foundOn}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {result.imagesWithoutAlt.length > 50 && expandedImages && (
                <p style={{marginTop: '10px', fontSize: '0.9em', color: '#888'}}>Showing {result.imagesWithoutAlt.length} images total...</p>
              )}
            </div>
          ) : (
            <p className="success">✅ All images have ALT text</p>
          )}

          <h3>�🔗 Broken Links</h3>
          {result.brokenLinks?.length ? (
            <div className="links-section">
              <div className="links-header" onClick={() => setExpandedLinks(!expandedLinks)}>
                <p className="warning-text">⚠️ {result.brokenLinks.length} broken links found</p>
                <span className={`arrow ${expandedLinks ? "expanded" : ""}`}>▶</span>
              </div>
              
              {expandedLinks && (
                <table className="links-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Broken link</th>
                  <th>Link Text</th>
                  <th>Found On Page</th>
                  <th>Element Location</th>
                  <th>Server response</th>
                </tr>
              </thead>
              <tbody>
                {result.brokenLinks.map((link, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{link.url}</td>
                    <td>{link.text || "No text"}</td>
                    <td>{link.foundOn || "unknown"}</td>
                    <td>{link.selector || "unknown"}</td>
                    <td className="status-code">{link.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>              )}
            </div>          ) : (
            <p className="success">✅ No broken links</p>
          )}
        </div>
      )}
    </div>
  );
}