using System;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Simplicion.MediaStudio
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
                SetCurrentProcessExplicitAppUserModelID("Simplicion.180Workspace.MediaStudio");
            }
            catch {}

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string targetUrl = "http://localhost:5173/";

            if (args != null && args.Length > 0 && !string.IsNullOrEmpty(args[0]))
            {
                string raw = args[0].Trim();
                if (raw.StartsWith("workspace180://", StringComparison.OrdinalIgnoreCase))
                {
                    string stripped = raw.Substring("workspace180://".Length);
                    if (stripped.StartsWith("editor", StringComparison.OrdinalIgnoreCase))
                    {
                        stripped = stripped.Substring("editor".Length);
                    }
                    if (stripped.StartsWith("/"))
                    {
                        stripped = stripped.Substring(1);
                    }
                    if (!string.IsNullOrEmpty(stripped))
                    {
                        if (stripped.StartsWith("?"))
                        {
                            targetUrl = "http://localhost:5173/" + stripped;
                        }
                        else
                        {
                            targetUrl = "http://localhost:5173/?" + stripped;
                        }
                    }
                }
                else if (raw.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || raw.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                {
                    targetUrl = raw;
                }
            }

            Application.Run(new MainWindow(targetUrl));
        }
    }

    public class MainWindow : Form
    {
        private WebView2 webView;
        private string initialUrl;

        public MainWindow(string url)
        {
            this.initialUrl = url;
            this.Text = "180 Media Studio";
            this.Width = 1440;
            this.Height = 900;
            this.MinimumSize = new Size(1024, 700);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(7, 9, 14);

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

            InitializeWebView();
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
                    @"180Workspace\MediaStudio\Profile"
                );

                if (!Directory.Exists(userDataDir))
                {
                    Directory.CreateDirectory(userDataDir);
                }

                var env = await CoreWebView2Environment.CreateAsync(null, userDataDir);
                await webView.EnsureCoreWebView2Async(env);

                webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
                webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
                webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;

                webView.Source = new Uri(initialUrl);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Error initializing 180 Media Studio hardware canvas:\n\n" + ex.Message + "\n\nPlease ensure Edge WebView2 Runtime is installed.",
                    "180 Media Studio",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }
    }
}
