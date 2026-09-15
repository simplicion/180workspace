using System;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;
using System.Diagnostics;

namespace Simplicion.MediaStudio.Installer
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
            this.Text = "180 Media Studio Setup";
            this.Size = new Size(520, 360);
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
            badge.Size = new Size(40, 32);
            badge.Location = new Point(24, 24);
            badge.BackColor = Color.FromArgb(99, 102, 241);
            badge.ForeColor = Color.White;
            badge.Font = new Font("Segoe UI", 12F, FontStyle.Bold);
            badge.TextAlign = ContentAlignment.MiddleCenter;

            lblTitle = new Label();
            lblTitle.Text = "180 Media Studio";
            lblTitle.Font = new Font("Segoe UI", 14F, FontStyle.Bold);
            lblTitle.ForeColor = Color.White;
            lblTitle.Location = new Point(74, 22);
            lblTitle.AutoSize = true;

            lblSubtitle = new Label();
            lblSubtitle.Text = "Autonomous Desktop Video Editor • NVENC Stream-Copy Engine";
            lblSubtitle.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            lblSubtitle.ForeColor = Color.FromArgb(156, 163, 175);
            lblSubtitle.Location = new Point(76, 52);
            lblSubtitle.Size = new Size(410, 30);

            headerPanel.Controls.Add(badge);
            headerPanel.Controls.Add(lblTitle);
            headerPanel.Controls.Add(lblSubtitle);

            lblStatus = new Label();
            lblStatus.Text = "Ready to install 180 Media Studio native runtime...";
            lblStatus.Location = new Point(24, 140);
            lblStatus.Size = new Size(460, 24);
            lblStatus.ForeColor = Color.FromArgb(209, 213, 219);

            progressBar = new ProgressBar();
            progressBar.Location = new Point(24, 170);
            progressBar.Size = new Size(456, 22);
            progressBar.Style = ProgressBarStyle.Continuous;
            progressBar.Value = 0;

            btnAction = new Button();
            btnAction.Text = "Install Now";
            btnAction.Size = new Size(160, 38);
            btnAction.Location = new Point(320, 250);
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
            if (btnAction.Text == "Launch Studio")
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
            UpdateProgress(10, "Preparing installation directory...");
            Thread.Sleep(200);

            string installDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"180Workspace\MediaStudio");
            if (!Directory.Exists(installDir))
            {
                Directory.CreateDirectory(installDir);
            }

            UpdateProgress(30, "Extracting native 180 Media Studio runtime & engine...");
            Assembly asm = Assembly.GetExecutingAssembly();
            string[] payloadFiles = new string[]
            {
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

            string destExe = Path.Combine(installDir, "180MediaStudio.exe");

            UpdateProgress(60, "Registering workspace180:// custom URI protocol...");
            Thread.Sleep(250);

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

            UpdateProgress(85, "Creating official desktop & start menu shortcuts...");
            Thread.Sleep(200);

            try
            {
                CreateShortcut(
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "180 Media Studio.lnk"),
                    destExe,
                    "180 Media Studio Autonomous Editor"
                );

                string startMenuDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs");
                if (Directory.Exists(startMenuDir))
                {
                    CreateShortcut(
                        Path.Combine(startMenuDir, "180 Media Studio.lnk"),
                        destExe,
                        "180 Media Studio Autonomous Editor"
                    );
                }
            }
            catch {}

            UpdateProgress(100, "Installation Complete! 180 Media Studio is ready.");
            Thread.Sleep(400);

            this.Invoke(new Action(() => {
                btnAction.Text = "Launch Studio";
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

        private void LaunchInstalledApp()
        {
            string installDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"180Workspace\MediaStudio");
            string destExe = Path.Combine(installDir, "180MediaStudio.exe");
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
