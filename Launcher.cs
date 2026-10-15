using System;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Diagnostics;
using System.Reflection;
using System.Threading;
using System.Collections.Generic;

namespace WorldTycoonLauncher
{
    class Program
    {
        private static HttpListener _listener;
        private static string _webRoot;
        private static int _port = 3000;
        private static bool _running = true;

        private static readonly Dictionary<string, string> MimeTypes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { ".html", "text/html; charset=utf-8" },
            { ".htm",  "text/html; charset=utf-8" },
            { ".js",   "application/javascript; charset=utf-8" },
            { ".mjs",  "application/javascript; charset=utf-8" },
            { ".css",  "text/css; charset=utf-8" },
            { ".json", "application/json; charset=utf-8" },
            { ".png",  "image/png" },
            { ".jpg",  "image/jpeg" },
            { ".jpeg", "image/jpeg" },
            { ".gif",  "image/gif" },
            { ".svg",  "image/svg+xml" },
            { ".ico",  "image/x-icon" },
            { ".woff", "font/woff" },
            { ".woff2","font/woff2" },
            { ".ttf",  "font/ttf" }
        };

        static void Main(string[] args)
        {
            Console.Title = "World Tycoon: Global Edition - Standalone WebRTC Game Server";
            Console.ForegroundColor = ConsoleColor.Cyan;

            PrintBanner();

            try
            {
                // 1. Prepare Game Assets Directory
                PrepareAssets();

                // 2. Start Local HTTP Server
                StartServer();

                // 3. Launch Web Browser
                string roomCode = ExtractRoomCode(args);
                LaunchBrowser(roomCode);

                // 4. Interactive Console Loop
                RunConsoleLoop();
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("\n[ERROR] An unexpected error occurred: " + ex.Message);
                Console.WriteLine(ex.StackTrace);
                Console.ResetColor();
                Console.WriteLine("\nPress any key to exit...");
                try
                {
                    if (!Console.IsInputRedirected)
                    {
                        Console.ReadKey();
                    }
                }
                catch { }
            }
            finally
            {
                StopServer();
            }
        }

        private static void PrintBanner()
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine(@"  __          __        _     _   _______                             ");
            Console.WriteLine(@"  \ \        / /       | |   | | |__   __|                            ");
            Console.WriteLine(@"   \ \  /\  / /___  _ __| | __| |    | |_   _  ___ ___   ___  _ __    ");
            Console.WriteLine(@"    \ \/  \/ // _ \| '__| |/ _` |    | | | | |/ __/ _ \ / _ \| '_ \   ");
            Console.WriteLine(@"     \  /\  /| (_) | |  | | (_| |    | | |_| | (_| (_) | (_) | | | |  ");
            Console.WriteLine(@"      \/  \/  \___/|_|  |_|\__,_|    |_|\__, |\___\___/ \___/|_| |_|  ");
            Console.WriteLine(@"                                         __/ |                        ");
            Console.WriteLine(@"         GLOBAL EDITION  *  3D WEBRTC   |___/                         ");
            Console.WriteLine(@" =====================================================================");
            Console.ResetColor();
        }

        private static void PrepareAssets()
        {
            string exeDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);

            // Option A: Local folder exists next to exe
            string localWorldTycoon = Path.Combine(exeDir, "world-tycoon");
            if (Directory.Exists(localWorldTycoon) && File.Exists(Path.Combine(localWorldTycoon, "index.html")))
            {
                _webRoot = localWorldTycoon;
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("[+] Using local assets from: " + _webRoot);
                Console.ResetColor();
                return;
            }

            // Option B: Exe is inside world-tycoon folder
            if (File.Exists(Path.Combine(exeDir, "index.html")))
            {
                _webRoot = exeDir;
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("[+] Using current directory assets: " + _webRoot);
                Console.ResetColor();
                return;
            }

            // Option C: Extract embedded assets.zip to %TEMP%\WorldTycoon_Game\
            string tempDir = Path.Combine(Path.GetTempPath(), "WorldTycoon_Game");
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("[*] Extracting embedded game assets to: " + tempDir + " ...");
            Console.ResetColor();

            if (!Directory.Exists(tempDir))
            {
                Directory.CreateDirectory(tempDir);
            }

            Assembly asm = Assembly.GetExecutingAssembly();
            using (Stream resStream = asm.GetManifestResourceStream("WorldTycoon.assets.zip"))
            {
                if (resStream != null)
                {
                    using (ZipArchive archive = new ZipArchive(resStream, ZipArchiveMode.Read))
                    {
                        foreach (ZipArchiveEntry entry in archive.Entries)
                        {
                            if (string.IsNullOrEmpty(entry.Name)) continue; // skip directory entries

                            string destinationPath = Path.Combine(tempDir, entry.FullName.Replace('/', Path.DirectorySeparatorChar));
                            string destDir = Path.GetDirectoryName(destinationPath);
                            if (!Directory.Exists(destDir))
                            {
                                Directory.CreateDirectory(destDir);
                            }

                            entry.ExtractToFile(destinationPath, true);
                        }
                    }
                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.WriteLine("[+] Assets extracted and verified successfully!");
                    Console.ResetColor();
                }
                else
                {
                    throw new FileNotFoundException("Embedded game archive (WorldTycoon.assets.zip) not found in executable.");
                }
            }

            _webRoot = tempDir;
        }

        private static void StartServer()
        {
            for (int p = 3000; p <= 3050; p++)
            {
                try
                {
                    _listener = new HttpListener();
                    _listener.Prefixes.Add("http://localhost:" + p + "/");
                    _listener.Start();
                    _port = p;
                    break;
                }
                catch
                {
                    if (_listener != null)
                    {
                        try { _listener.Close(); } catch { }
                        _listener = null;
                    }
                }
            }

            if (_listener == null || !_listener.IsListening)
            {
                throw new InvalidOperationException("Could not bind an available HTTP port between 3000 and 3050.");
            }

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("[+] Local Web Server running on: http://localhost:" + _port + "/");
            Console.ForegroundColor = ConsoleColor.Magenta;
            Console.WriteLine("[+] PeerJS WebRTC Cloud Broker: Ready & Connected");
            Console.ResetColor();

            // Begin async request listening
            _listener.BeginGetContext(OnRequestReceived, null);
        }

        private static void OnRequestReceived(IAsyncResult ar)
        {
            if (!_running || _listener == null || !_listener.IsListening) return;

            try
            {
                HttpListenerContext context = _listener.EndGetContext(ar);
                // Immediately queue next request for high concurrency
                _listener.BeginGetContext(OnRequestReceived, null);

                ProcessRequest(context);
            }
            catch (Exception)
            {
                if (_running && _listener != null && _listener.IsListening)
                {
                    try { _listener.BeginGetContext(OnRequestReceived, null); } catch { }
                }
            }
        }

        private static void ProcessRequest(HttpListenerContext context)
        {
            HttpListenerRequest request = context.Request;
            HttpListenerResponse response = context.Response;

            try
            {
                // Handle CORS pre-flight
                response.Headers["Access-Control-Allow-Origin"] = "*";
                response.Headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
                response.Headers["Access-Control-Allow-Headers"] = "*";
                response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";

                if (request.HttpMethod == "OPTIONS")
                {
                    response.StatusCode = 200;
                    response.OutputStream.Close();
                    return;
                }

                string urlPath = request.Url.LocalPath.TrimStart('/');
                if (string.IsNullOrEmpty(urlPath))
                {
                    urlPath = "index.html";
                }

                // Security: Prevent path traversal
                urlPath = urlPath.Replace('/', Path.DirectorySeparatorChar);
                if (urlPath.Contains(".."))
                {
                    response.StatusCode = 403;
                    response.OutputStream.Close();
                    return;
                }

                string filePath = Path.Combine(_webRoot, urlPath);

                if (File.Exists(filePath))
                {
                    string ext = Path.GetExtension(filePath);
                    string mime;
                    if (!MimeTypes.TryGetValue(ext, out mime))
                    {
                        mime = "application/octet-stream";
                    }

                    response.ContentType = mime;
                    byte[] buffer = File.ReadAllBytes(filePath);
                    response.ContentLength64 = buffer.Length;
                    response.OutputStream.Write(buffer, 0, buffer.Length);
                }
                else
                {
                    response.StatusCode = 404;
                    byte[] msg = System.Text.Encoding.UTF8.GetBytes("404 - Not Found: " + urlPath);
                    response.OutputStream.Write(msg, 0, msg.Length);
                }
            }
            catch
            {
                // Ignore transient client disconnects
            }
            finally
            {
                try { response.OutputStream.Close(); } catch { }
            }
        }

        private static string ExtractRoomCode(string[] args)
        {
            if (args != null && args.Length > 0)
            {
                string arg = args[0].Trim();
                if (arg.StartsWith("?room=", StringComparison.OrdinalIgnoreCase))
                {
                    return arg.Substring(6).Trim();
                }
                if (arg.StartsWith("room=", StringComparison.OrdinalIgnoreCase))
                {
                    return arg.Substring(5).Trim();
                }
                if (arg.Length >= 4 && arg.Length <= 8)
                {
                    return arg;
                }
            }
            return null;
        }

        private static void LaunchBrowser(string roomCode)
        {
            string url = "http://localhost:" + _port + "/";
            if (!string.IsNullOrEmpty(roomCode))
            {
                url += "?room=" + Uri.EscapeDataString(roomCode.ToUpper());
            }

            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("[*] Launching game in your browser: " + url);
            Console.ResetColor();

            try
            {
                Process.Start(url);
            }
            catch
            {
                // Fallback for Windows Process.Start quirks
                try
                {
                    Process.Start(new ProcessStartInfo("cmd", "/c start " + url.Replace("&", "^&")) { CreateNoWindow = true });
                }
                catch
                {
                    Console.WriteLine("[!] Could not open browser automatically. Please open: " + url);
                }
            }
        }

        private static void RunConsoleLoop()
        {
            Console.ForegroundColor = ConsoleColor.White;
            Console.WriteLine("\n---------------------------------------------------------------------");
            Console.WriteLine(" HOW TO PLAY ONLINE WITH YOUR FRIEND:");
            Console.WriteLine(" 1. One player hosts: select '🌐 Online WebRTC (P2P)' and click 'Create Room'");
            Console.WriteLine(" 2. Note down the 4-letter Room Code (e.g. 8492) and send it to your friend");
            Console.WriteLine(" 3. Your friend launches WorldTycoon.exe, enters the code, and clicks 'Connect'");
            Console.WriteLine(" 4. Host clicks 'ENTER THE BOARD & START GAME' - you're live in 3D!");
            Console.WriteLine("---------------------------------------------------------------------");
            Console.WriteLine(" HOTKEYS:");
            Console.WriteLine("  [B] -> Re-open Game in Browser");
            Console.WriteLine("  [C] -> Connect to a friend's Room Code now");
            Console.WriteLine("  [Q] or [ESC] -> Quit and Close Game Server");
            Console.WriteLine("=====================================================================\n");
            Console.ResetColor();

            bool isRedirected = false;
            try
            {
                isRedirected = Console.IsInputRedirected;
            }
            catch
            {
                isRedirected = true;
            }

            if (isRedirected)
            {
                ManualResetEvent quitEvent = new ManualResetEvent(false);
                Console.CancelKeyPress += (sender, e) =>
                {
                    e.Cancel = true;
                    _running = false;
                    quitEvent.Set();
                };

                while (_running)
                {
                    quitEvent.WaitOne(1000);
                }
                return;
            }

            while (_running)
            {
                try
                {
                    if (Console.KeyAvailable)
                    {
                        ConsoleKeyInfo key = Console.ReadKey(true);
                        if (key.Key == ConsoleKey.Q || key.Key == ConsoleKey.Escape)
                        {
                            Console.WriteLine("\n[*] Shutting down server. Goodbye!");
                            break;
                        }
                        else if (key.Key == ConsoleKey.B)
                        {
                            LaunchBrowser(null);
                        }
                        else if (key.Key == ConsoleKey.C)
                        {
                            Console.Write("\nEnter friend's 4-character Room Code: ");
                            string code = Console.ReadLine();
                            if (!string.IsNullOrEmpty(code))
                            {
                                LaunchBrowser(code.Trim());
                            }
                        }
                    }
                }
                catch (InvalidOperationException)
                {
                    Thread.Sleep(1000);
                    continue;
                }
                Thread.Sleep(100);
            }
        }

        private static void StopServer()
        {
            _running = false;
            if (_listener != null)
            {
                try
                {
                    _listener.Stop();
                    _listener.Close();
                }
                catch { }
                _listener = null;
            }
        }
    }
}
