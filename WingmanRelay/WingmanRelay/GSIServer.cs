﻿using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace WingmanRelay {
    internal class GsiServer {
        
        private HttpListener listener;
        private HttpClient client;
        
        private readonly string url;
        private readonly string serverUrl;
        private readonly string localAppDataPath = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        private readonly string appDataPath = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);

        public GsiServer(string url, string serverUrl) {
            this.url = url;
            this.serverUrl = serverUrl;
        }
        
        private string latestData = "";
        

        private static string getRequestData(Stream body) {
            
            // Encoding encoding = request.ContentEncoding;
            var reader = new StreamReader(body);

            // Convert the data to a string and display it on the console.
            var s = reader.ReadToEnd();

            body.Close();
            reader.Close();
            // If you are finished with the request, it should be closed also.
            return s;
        }

        private bool firstLatch = true;
        private async Task handleIncomingConnections() {
            
            // While a user hasn't visited the `shutdown` url, keep on handling requests
            while (true) {
                // Will wait here until we hear from a connection
                HttpListenerContext ctx = await listener.GetContextAsync();

                // Peel out the requests and response objects
                HttpListenerRequest req = ctx.Request;
                HttpListenerResponse resp = ctx.Response;

                // If it starts with this, it is a request from the server
                var response = getRequestData(req.InputStream);
                latestData = response;
                // Console.Write((latestData));
                    HttpResponseMessage r = await client.PostAsync(serverUrl, new StringContent(latestData));
                    if (firstLatch) {
                        Console.WriteLine("Connected to Wingman Tournament Server!");
                        firstLatch = false;
                    }
                    var res = getRequestData(await r.Content.ReadAsStreamAsync());
                    if (res.StartsWith("map-info")) {
                        res = res.Replace("map-info;", "");
                        var thread = new Thread(saveFile);
                        thread.Start(res);
                    }
                resp.Close();
            }
        }

        private void saveFile(object o) {
            string path = (appDataPath) + @"\hud-manager\databases\matches";
            string currentText = File.ReadAllText(path);
            Console.Write(currentText);
            using (StreamWriter writer = new StreamWriter(path, false)){
                Console.WriteLine("WRITING TO MATCH FILE");
                writer.Write((string)o);
                Console.WriteLine("WROTE TO MATCH FILE");
            }
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
            
            startLexogrine();
        }

        public void startLexogrine() {
            Process.Start(localAppDataPath +@"\Programs\hud-manager\Lexogrine HUD Manager.exe");
            Console.WriteLine("Successfully Started Lexogrine");
        }
        
        public void start() {
            // Create a Http server and start listening for incoming connections
            listener = new HttpListener();
            listener.Prefixes.Add(url);
            listener.Start();
            Console.WriteLine("Listening for connections on {0}", url);
            client = new HttpClient();

            // Handle requests
            Task listenTask = handleIncomingConnections();
            listenTask.GetAwaiter().GetResult();

            // Close the listener
            listener.Close();
        }
    }
}