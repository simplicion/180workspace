using System;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;
using System.Diagnostics;

namespace Simplicion.Workspace180.Installer
{
    public class SetupForm : Form
    {
        private Label lblTitle;
        private Label lblSubtitle;
        private Label lblStatus;
        private ProgressBar progressBar;
        private Button btnAction;
        private Panel headerPanel;

        public SetupForm()
        {
            InitializeComponent();
        }

        private void InitializeComponent()
        {
            this.Text = "180 Workspace Setup";
            this.Size = new Size(540, 370);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(15, 17, 23);
            this.ForeColor = Color.White;
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular);

            headerPanel = new Panel();
            headerPanel.Dock = DockStyle.Top;
            headerPanel.Height = 110;
            headerPanel.BackColor = Color.FromArgb(20, 24, 34);

            Label badge = new Label();
            badge.Text = "180";
            badge.Size = new Size(42, 34);
            badge.Location = new Point(24, 24);
            badge.BackColor = Color.FromArgb(99, 102, 241);
            badge.ForeColor = Color.White;
            badge.Font = new Font("Segoe UI", 12F, FontStyle.Bold);
            badge.TextAlign = ContentAlignment.MiddleCenter;

            lblTitle = new Label();
            lblTitle.Text = "180 Workspace Desktop";
            lblTitle.Font = new Font("Segoe UI", 14F, FontStyle.Bold);
            lblTitle.ForeColor = Color.White;
            lblTitle.Location = new Point(76, 22);
            lblTitle.AutoSize = true;

            lblSubtitle = new Label();
            lblSubtitle.Text = "Universal Enterprise Workspace • Autonomous Media Studio • GPU Engine";
            lblSubtitle.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            lblSubtitle.ForeColor = Color.FromArgb(156, 163, 175);
            lblSubtitle.Location = new Point(78, 52);
            lblSubtitle.Size = new Size(430, 30);

            headerPanel.Controls.Add(badge);
            headerPanel.Controls.Add(lblTitle);
            headerPanel.Controls.Add(lblSubtitle);

            lblStatus = new Label();
            lblStatus.Text = "Ready to install 180 Workspace native desktop platform...";
            lblStatus.Location = new Point(24, 140);
            lblStatus.Size = new Size(480, 24);
            lblStatus.ForeColor = Color.FromArgb(209, 213, 219);

            progressBar = new ProgressBar();
            progressBar.Location = new Point(24, 170);
            progressBar.Size = new Size(476, 22);
            progressBar.Style = ProgressBarStyle.Continuous;
            progressBar.Value = 0;

            btnAction = new Button();
            btnAction.Text = "Install Now";
            btnAction.Size = new Size(160, 38);
            btnAction.Location = new Point(340, 260);
            btnAction.BackColor = Color.FromArgb(99, 102, 241);
            btnAction.ForeColor = Color.White;
            btnAction.FlatStyle = FlatStyle.Flat;
            btnAction.FlatAppearance.BorderSize = 0;
            btnAction.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            btnAction.Cursor = Cursors.Hand;
            btnAction.Click += new EventHandler(BtnAction_Click);

            this.Controls.Add(headerPanel);
            this.Controls.Add(lblStatus);
            this.Controls.Add(progressBar);
            this.Controls.Add(btnAction);

            // Load app icon
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

            this.Shown += (s, e) => {
                StartInstallation();
            };
        }

        private void BtnAction_Click(object sender, EventArgs e)
        {
            if (btnAction.Text == "Launch Workspace")
            {
                LaunchInstalledApp();
                Application.Exit();
            }
            else
            {
                StartInstallation();
            }
        }

        private void StartInstallation()
        {
            btnAction.Enabled = false;
            Thread t = new Thread(RunInstallWorker);
            t.IsBackground = true;
            t.Start();
        }

        private void RunInstallWorker()
        {
            UpdateProgress(10, "Preparing 180 Workspace directory...");
            Thread.Sleep(200);

            string installDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"180Workspace\Desktop");
            if (!Directory.Exists(installDir))
            {
                Directory.CreateDirectory(installDir);
            }

            string wwwrootDest = Path.Combine(installDir, "wwwroot");
            if (!Directory.Exists(wwwrootDest))
            {
                Directory.CreateDirectory(wwwrootDest);
            }

            UpdateProgress(30, "Extracting native 180 Workspace container & GPU bridge...");
            Assembly asm = Assembly.GetExecutingAssembly();
            string[] payloadFiles = new string[]
            {
                "180Workspace.exe",
                "180MediaStudio.exe",
                "Microsoft.Web.WebView2.WinForms.dll",
                "Microsoft.Web.WebView2.Core.dll",
                "WebView2Loader.dll",
                "app.ico"
            };

            foreach (string fileName in payloadFiles)
            {
                string destFile = Path.Combine(installDir, fileName);
                try
                {
                    string resName = null;
                    foreach (string n in asm.GetManifestResourceNames())
                    {
                        if (n.EndsWith(fileName, StringComparison.OrdinalIgnoreCase))
                        {
                            resName = n;
                            break;
                        }
                    }

                    if (!string.IsNullOrEmpty(resName))
                    {
                        using (Stream s = asm.GetManifestResourceStream(resName))
                        using (FileStream fs = new FileStream(destFile, FileMode.Create, FileAccess.Write))
                        {
                            s.CopyTo(fs);
                        }
                    }
                    else
                    {
                        string sibling = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, fileName);
                        if (!File.Exists(sibling))
                        {
                            sibling = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "bin", fileName);
                        }
                        if (File.Exists(sibling))
                        {
                            File.Copy(sibling, destFile, true);
                        }
                    }
                }
                catch {}
            }

            UpdateProgress(55, "Deploying 180 Workspace studio assets & hardware renderers...");
            string[] wwwrootCandidates = new string[]
            {
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot"),
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "dist"),
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, @"..\dist"),
                @"C:\Users\saavi\Desktop\180workspace\apps\desktop-editor\dist"
            };

            foreach (string candidate in wwwrootCandidates)
            {
                try
                {
                    if (Directory.Exists(candidate) && File.Exists(Path.Combine(candidate, "index.html")))
                    {
                        CopyDirectoryRecursive(candidate, wwwrootDest);
                        break;
                    }
                }
                catch {}
            }

            string destExe = Path.Combine(installDir, "180Workspace.exe");
            if (!File.Exists(destExe))
            {
                string altExe = Path.Combine(installDir, "180MediaStudio.exe");
                if (File.Exists(altExe))
                {
                    try { File.Copy(altExe, destExe, true); } catch {}
                }
            }

            UpdateProgress(75, "Registering workspace180:// deep link protocol in Windows Registry...");
            Thread.Sleep(200);

            try
            {
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Classes\workspace180"))
                {
                    key.SetValue("", "URL:180 Workspace Protocol");
                    key.SetValue("URL Protocol", "");

                    using (RegistryKey iconKey = key.CreateSubKey("DefaultIcon"))
                    {
                        string icoPath = Path.Combine(installDir, "app.ico");
                        if (File.Exists(icoPath))
                        {
                            iconKey.SetValue("", "\"" + icoPath + "\",0");
                        }
                        else
                        {
                            iconKey.SetValue("", "\"" + destExe + "\",0");
                        }
                    }

                    using (RegistryKey cmdKey = key.CreateSubKey(@"shell\open\command"))
                    {
                        cmdKey.SetValue("", "\"" + destExe + "\" \"%1\"");
                    }
                }
            }
            catch {}

            UpdateProgress(90, "Creating official 180 Workspace shortcuts...");
            Thread.Sleep(200);

            try
            {
                CreateShortcut(
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "180 Workspace.lnk"),
                    destExe,
                    "180 Workspace - Universal Enterprise Suite & Studio"
                );

                string startMenuDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs");
                if (Directory.Exists(startMenuDir))
                {
                    CreateShortcut(
                        Path.Combine(startMenuDir, "180 Workspace.lnk"),
                        destExe,
                        "180 Workspace - Universal Enterprise Suite & Studio"
                    );
                }
            }
            catch {}

            UpdateProgress(100, "Installation Complete! 180 Workspace is ready.");
            Thread.Sleep(400);

            this.Invoke(new Action(() => {
                btnAction.Text = "Launch Workspace";
                btnAction.Enabled = true;
                LaunchInstalledApp();
                this.Close();
            }));
        }

        private void CreateShortcut(string shortcutPath, string targetPath, string description)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType != null)
                {
                    dynamic shell = Activator.CreateInstance(shellType);
                    dynamic shortcut = shell.CreateShortcut(shortcutPath);
                    shortcut.TargetPath = targetPath;
                    shortcut.WorkingDirectory = Path.GetDirectoryName(targetPath);
                    shortcut.Description = description;
                    string icoPath = Path.Combine(Path.GetDirectoryName(targetPath), "app.ico");
                    if (File.Exists(icoPath))
                    {
                        shortcut.IconLocation = icoPath + ",0";
                    }
                    else
                    {
                        shortcut.IconLocation = targetPath + ",0";
                    }
                    shortcut.Save();
                }
            }
            catch {}
        }

        private void CopyDirectoryRecursive(string sourceDir, string targetDir)
        {
            if (!Directory.Exists(targetDir))
            {
                Directory.CreateDirectory(targetDir);
            }

            foreach (string file in Directory.GetFiles(sourceDir))
            {
                string destFile = Path.Combine(targetDir, Path.GetFileName(file));
                try
                {
                    File.Copy(file, destFile, true);
                }
                catch {}
            }

            foreach (string subDir in Directory.GetDirectories(sourceDir))
            {
                string destSubDir = Path.Combine(targetDir, Path.GetFileName(subDir));
                CopyDirectoryRecursive(subDir, destSubDir);
            }
        }

        private void LaunchInstalledApp()
        {
            string installDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"180Workspace\Desktop");
            string destExe = Path.Combine(installDir, "180Workspace.exe");
            if (!File.Exists(destExe))
            {
                destExe = Path.Combine(installDir, "180MediaStudio.exe");
            }
            if (File.Exists(destExe))
            {
                Process.Start(destExe);
            }
        }

        private void UpdateProgress(int val, string status)
        {
            if (this.InvokeRequired)
            {
                this.Invoke(new Action<int, string>(UpdateProgress), val, status);
                return;
            }
            progressBar.Value = Math.Min(100, Math.Max(0, val));
            lblStatus.Text = status;
        }

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new SetupForm());
        }
    }
}

