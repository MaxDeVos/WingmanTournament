using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace WingmanRelay {
    internal class RelayClient {
        
        private readonly string localAppDataPath = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        private readonly string appDataPath = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        
        private HttpClient client;
        private bool connected;
        private readonly string url;
        private readonly string externalIP;
        private static string lastData;

        public RelayClient(string url) {
            this.url = url;
            // Collect our external IP for use with lexogrine.
            externalIP = new WebClient().DownloadString("https://whatismyip.host/ip4");
        }
        
        private async void handleInitialConnection() {

            while (!connected) {
                try {
                    HttpResponseMessage m = await client.PostAsync(url, new StringContent("url:" + externalIP));
                    Console.WriteLine("Successfully Connected!");
                    connected = true;
                    looper();
                }
                catch (Exception e) {
                    Console.WriteLine("Failed To Connect.  Retrying in one second");
                    connected = false;
                    Thread.Sleep(1000);
                }
            }
        }

        private async void looper() {
            
            while (connected) {
                try {

                    HttpResponseMessage m = await client.PostAsync(url, new StringContent(GSIThread.latestData));
                    Stream s = await m.Content.ReadAsStreamAsync();
                    var readStream = new StreamReader (s, Encoding.UTF8);
                    string response = await readStream.ReadToEndAsync();
                    if (response.Contains("map-info;")) {
                        
                        response = response.Replace("map-info;", "");
                        
                        Console.WriteLine("Received Map Selection Information!");
                        Console.WriteLine(response);

                        var thread = new Thread(saveFile);
                        thread.Start(response);
                    }

                    // If sending duplicate data ends up being an issue, mess around with this.
                    // string localLatest = GSIThread.latestData;
                    // if (!lastData.Equals(localLatest)) {
                    //     lastData = localLatest;
                    //     HttpResponseMessage m = await client.PostAsync(url, new StringContent(GSIThread.latestData));
                    // }

                }
                catch (Exception e) {
                    Console.WriteLine("Lost connection to server.  Retrying in one second");
                    connected = false;
                    break;
                }
            }
            handleInitialConnection();
        }

        private void saveFile(object o) {
            
            Process[] processes = Process.GetProcessesByName("Lexogrine HUD Manager");
            Console.WriteLine("Closing Lexogrine");
            foreach (Process p in processes) {
                p.Kill();
                Console.WriteLine("Closed Lexogrine Instance");
            }
            Console.WriteLine("Successfully Closed Lexogrine");
            
            while (Process.GetProcessesByName("Lexogrine HUD Manager").Length != 0) {
                Console.WriteLine("Waiting For Lexogrine to close!");
                Thread.Sleep(500);
            }
            
            string path = (appDataPath) + @"\hud-manager\databases\matches";
            string currentText = File.ReadAllText(path);
            Console.Write(currentText);
            using (StreamWriter writer = new StreamWriter(path, false)){
                Console.WriteLine("WRITING TO MATCH FILE");
                writer.Write((string)o);
                Console.WriteLine("WROTE TO MATCH FILE");
            }

            Thread.Sleep(250);
            
            startLexogrine();
            
        }

        public void startLexogrine() {
            var thread = new Thread(lexogrineStarter);
            thread.Start();
        }

        private void lexogrineStarter() {
            Process.Start(localAppDataPath + @"\Programs\hud-manager\Lexogrine HUD Manager.exe");
            Console.WriteLine("Successfully Started Lexogrine");
        }

        public void start() {
            Console.WriteLine("Listening for connections on {0}", url);
            client = new HttpClient();

            // Handle requests
            handleInitialConnection();
        }
    }
}