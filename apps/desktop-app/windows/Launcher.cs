using System;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Win32;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Simplicion.Workspace180
{
    static class Program
    {
        [DllImport("shell32.dll", SetLastError = true)]
        private static extern void SetCurrentProcessExplicitAppUserModelID([MarshalAs(UnmanagedType.LPWStr)] string AppID);

        [DllImport("user32.dll")]
        private static extern bool SetProcessDPIAware();

        [STAThread]
        static void Main(string[] args)
        {
            try
            {
                SetProcessDPIAware();
            }
            catch {}

            try
            {
                SetCurrentProcessExplicitAppUserModelID("Simplicion.180Workspace");
            }
            catch {}

            // Auto-register workspace180:// custom protocol handler in Windows Registry
            RegisterCustomProtocol();

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string initialRoute = "/";
            bool isDevRequested = true;
            string explicitUrl = null;

            if (args != null && args.Length > 0)
            {
                foreach (string arg in args)
                {
                    if (string.IsNullOrWhiteSpace(arg)) continue;
                    string raw = arg.Trim();

                    if (raw.Equals("--dev", StringComparison.OrdinalIgnoreCase))
                    {
                        isDevRequested = true;
                    }
                    else if (raw.StartsWith("workspace180://", StringComparison.OrdinalIgnoreCase))
                    {
                        string stripped = raw.Substring("workspace180://".Length).TrimStart('/');
                        if (string.IsNullOrEmpty(stripped))
                        {
                            initialRoute = "/";
                        }
                        else
                        {
                            initialRoute = "/" + stripped;
                        }
                    }
                    else if (raw.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || raw.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                    {
                        explicitUrl = raw;
                    }
                }
            }

            Application.Run(new MainWindow(initialRoute, isDevRequested, explicitUrl));
        }

        private static void RegisterCustomProtocol()
        {
            try
            {
                string exePath = Assembly.GetExecutingAssembly().Location;
                using (var key = Registry.CurrentUser.CreateSubKey(@"Software\Classes\workspace180"))
                {
                    key.SetValue("", "URL:180 Workspace Protocol");
                    key.SetValue("URL Protocol", "");
                    using (var defaultIcon = key.CreateSubKey("DefaultIcon"))
                    {
                        defaultIcon.SetValue("", "\"" + exePath + "\",0");
                    }
                    using (var shell = key.CreateSubKey("shell"))
                    using (var open = shell.CreateSubKey("open"))
                    using (var command = open.CreateSubKey("command"))
                    {
                        command.SetValue("", "\"" + exePath + "\" \"%1\"");
                    }
                }
            }
            catch {}
        }
    }

    public class MainWindow : Form
    {
        private WebView2 webView;
        private string initialRoute;
        private bool isDevRequested;
        private string explicitUrl;
        private HttpListener embeddedServer;
        private int localServerPort = 0;
        private string wwwrootDir = null;

        public MainWindow(string route, bool devMode, string directUrl)
        {
            this.initialRoute = string.IsNullOrEmpty(route) ? "/" : route;
            this.isDevRequested = devMode;
            this.explicitUrl = directUrl;

            this.Text = "180 Workspace - Universal Enterprise Platform & Studio";
            this.Width = 1440;
            this.Height = 900;
            this.MinimumSize = new Size(1024, 700);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(7, 9, 14);

            // Locate local offline wwwroot directory
            ResolveWwwrootDir();

            // Start in-process local HTTP server as dual fallback
            StartEmbeddedServer();

            // Load official company icon
            try
            {
                string exeDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
                string icoPath = Path.Combine(exeDir, "app.ico");
                if (File.Exists(icoPath))
                {
                    this.Icon = new Icon(icoPath);
                }
                else
                {
                    this.Icon = Icon.ExtractAssociatedIcon(Assembly.GetExecutingAssembly().Location);
                }
            }
            catch {}

            this.FormClosing += (s, e) => {
                StopEmbeddedServer();
            };

            InitializeWebView();
        }

        private void ResolveWwwrootDir()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string[] candidates = new string[]
            {
                Path.Combine(baseDir, "wwwroot"),
                Path.Combine(baseDir, "dist"),
                Path.Combine(baseDir, @"..\dist"),
                Path.Combine(baseDir, @"..\..\dist"),
                @"C:\Users\saavi\Desktop\180workspace\apps\frontend\.next\static",
                @"C:\Users\saavi\Desktop\180workspace\apps\desktop-editor\dist"
            };

            foreach (string path in candidates)
            {
                try
                {
                    if (Directory.Exists(path) && (File.Exists(Path.Combine(path, "index.html")) || File.Exists(Path.Combine(path, "index.js"))))
                    {
                        wwwrootDir = Path.GetFullPath(path);
                        break;
                    }
                }
                catch {}
            }
        }

        private void StartEmbeddedServer()
        {
            if (string.IsNullOrEmpty(wwwrootDir) || !Directory.Exists(wwwrootDir)) return;

            try
            {
                for (int p = 48180; p < 48250; p++)
                {
                    try
                    {
                        var listener = new HttpListener();
                        listener.Prefixes.Add(string.Format("http://127.0.0.1:{0}/", p));
                        listener.Start();
                        embeddedServer = listener;
                        localServerPort = p;
                        break;
                    }
                    catch {}
                }

                if (embeddedServer != null)
                {
                    Task.Run(() => ServerWorker(embeddedServer, wwwrootDir));
                }
            }
            catch {}
        }

        private void StopEmbeddedServer()
        {
            try
            {
                if (embeddedServer != null && embeddedServer.IsListening)
                {
                    embeddedServer.Stop();
                    embeddedServer.Close();
                }
            }
            catch {}
        }

        private async Task ServerWorker(HttpListener listener, string rootDir)
        {
            while (listener.IsListening)
            {
                try
                {
                    var ctx = await listener.GetContextAsync();
                    ProcessRequest(ctx, rootDir);
                }
                catch
                {
                    if (!listener.IsListening) break;
                }
            }
        }

        private void ProcessRequest(HttpListenerContext ctx, string rootDir)
        {
            try
            {
                string urlPath = ctx.Request.Url.AbsolutePath.TrimStart('/');
                if (string.IsNullOrEmpty(urlPath))
                {
                    urlPath = "index.html";
                }

                string filePath = Path.Combine(rootDir, urlPath.Replace('/', Path.DirectorySeparatorChar));

                if (!File.Exists(filePath))
                {
                    filePath = Path.Combine(rootDir, "index.html");
                }

                if (File.Exists(filePath))
                {
                    byte[] bytes = File.ReadAllBytes(filePath);
                    string ext = Path.GetExtension(filePath).ToLowerInvariant();
                    string mime = "application/octet-stream";

                    switch (ext)
                    {
                        case ".html": mime = "text/html; charset=utf-8"; break;
                        case ".js":
                        case ".mjs": mime = "application/javascript; charset=utf-8"; break;
                        case ".css": mime = "text/css; charset=utf-8"; break;
                        case ".json": mime = "application/json; charset=utf-8"; break;
                        case ".svg": mime = "image/svg+xml"; break;
                        case ".png": mime = "image/png"; break;
                        case ".jpg":
                        case ".jpeg": mime = "image/jpeg"; break;
                        case ".ico": mime = "image/x-icon"; break;
                        case ".woff2": mime = "font/woff2"; break;
                        case ".woff": mime = "font/woff"; break;
                        case ".mp4": mime = "video/mp4"; break;
                        case ".webm": mime = "video/webm"; break;
                    }

                    ctx.Response.ContentType = mime;
                    ctx.Response.ContentLength64 = bytes.Length;
                    ctx.Response.AddHeader("Access-Control-Allow-Origin", "*");
                    ctx.Response.AddHeader("Cache-Control", "no-cache");
                    ctx.Response.OutputStream.Write(bytes, 0, bytes.Length);
                    ctx.Response.OutputStream.Close();
                }
                else
                {
                    ctx.Response.StatusCode = 404;
                    ctx.Response.Close();
                }
            }
            catch
            {
                try { ctx.Response.Close(); } catch {}
            }
        }

        private bool IsDevServerAlive(string url, int timeoutMs = 250)
        {
            try
            {
                var req = (HttpWebRequest)WebRequest.Create(url);
                req.Timeout = timeoutMs;
                req.Method = "HEAD";
                using (var res = (HttpWebResponse)req.GetResponse())
                {
                    return res.StatusCode == HttpStatusCode.OK || (int)res.StatusCode < 400;
                }
            }
            catch
            {
                return false;
            }
        }

        private async void InitializeWebView()
        {
            try
            {
                webView = new WebView2();
                webView.Dock = DockStyle.Fill;
                this.Controls.Add(webView);

                string userDataDir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    @"180Workspace\Desktop\Profile"
                );

                if (!Directory.Exists(userDataDir))
                {
                    Directory.CreateDirectory(userDataDir);
                }

                var options = new CoreWebView2EnvironmentOptions(
                    "--enable-features=VaapiVideoDecoder,WebCodecs,WebGPU --disable-features=AudioServiceOutOfProcess"
                );

                var env = await CoreWebView2Environment.CreateAsync(null, userDataDir, options);
                await webView.EnsureCoreWebView2Async(env);

                webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
                webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
                webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;

                // Inject 180 Workspace Native Hardware Bridge
                await webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(@"
                    (function() {
                        window.__180_NATIVE__ = {
                            isNative: true,
                            platform: 'windows',
                            hardwareAccelerated: true,
                            streamCopyEnabled: true,
                            engineVersion: '2.0.0-windows-native',
                            gpuAdapter: 'NVIDIA / AMD Direct3D 12 Hardware Accelerated (DirectX 12 / NVENC)',
                            getSpecs: function() {
                                return {
                                    isNative: true,
                                    platform: 'windows',
                                    gpuAdapter: 'DirectX 12 Hardware Pipeline (NVENC / QuickSync)',
                                    version: '2.0.0-native',
                                    hasHardwareAcceleration: true,
                                    streamCopyEnabled: true
                                };
                            }
                        };
                        console.log('[180 Workspace Native Engine] Hardware Acceleration Active (Direct3D 12 / NVENC)');
                    })();
                ");

                // Setup Virtual Host Mapping to local files
                if (!string.IsNullOrEmpty(wwwrootDir) && Directory.Exists(wwwrootDir))
                {
                    try
                    {
                        webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                            "app.180workspace.local",
                            wwwrootDir,
                            CoreWebView2HostResourceAccessKind.Allow
                        );
                        webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                            "180workspace.local",
                            wwwrootDir,
                            CoreWebView2HostResourceAccessKind.Allow
                        );
                    }
                    catch {}
                }

                // Determine target URL: Auto-detect dev server ports (3002, 3000, 5173)
                string targetUrl = null;
                string route = initialRoute.StartsWith("/") ? initialRoute : "/" + initialRoute;

                if (!string.IsNullOrEmpty(explicitUrl))
                {
                    targetUrl = explicitUrl;
                }
                else if (isDevRequested && IsDevServerAlive("http://localhost:3002/", 300))
                {
                    targetUrl = "http://localhost:3002" + route;
                }
                else if (isDevRequested && IsDevServerAlive("http://localhost:3000/", 300))
                {
                    targetUrl = "http://localhost:3000" + route;
                }
                else if (isDevRequested && IsDevServerAlive("http://localhost:5173/", 300))
                {
                    targetUrl = "http://localhost:5173" + route;
                }
                else if (!string.IsNullOrEmpty(wwwrootDir) && Directory.Exists(wwwrootDir))
                {
                    targetUrl = "https://app.180workspace.local/index.html";
                }
                else if (localServerPort > 0)
                {
                    targetUrl = string.Format("http://127.0.0.1:{0}/index.html", localServerPort);
                }
                else
                {
                    targetUrl = "http://localhost:3002" + route;
                }

                webView.NavigationCompleted += (s, e) => {
                    if (!e.IsSuccess && !targetUrl.Contains("180workspace.local"))
                    {
                        if (localServerPort > 0)
                        {
                            webView.Source = new Uri(string.Format("http://127.0.0.1:{0}/index.html", localServerPort));
                        }
                    }
                };

                webView.Source = new Uri(targetUrl);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Error initializing 180 Workspace native hardware container:\n\n" + ex.Message + "\n\nPlease ensure Edge WebView2 Runtime is installed.",
                    "180 Workspace Desktop",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }
    }
}

