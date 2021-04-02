using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;

namespace WingmanRelay {
    internal class GSIThread {
        
        private static HttpListener listener;

        public static string latestData = "";
        private static string url;
        private readonly string serverUrl;
        public static bool csgoConnected = false;
        
        public GSIThread(string gsiPort) {
            url = "http://localhost:" + gsiPort + "/";
        }

        private static async Task handleIncomingConnections() {
            
            while (true) {
                try {
                    // Will wait here until we hear from a connection
                    HttpListenerContext ctx = await listener.GetContextAsync();

                    if (!csgoConnected) {
                        Console.WriteLine("Connected To CSGO!");
                        csgoConnected = true;
                    }

                    // Peel out the requests and response objects
                    HttpListenerRequest req = ctx.Request;
                    HttpListenerResponse resp = ctx.Response;

                    // If it starts with this, it is a request from the server
                    var response = getRequestData(req.InputStream);
                    latestData = response;

                    resp.Close();
                }
                catch (HttpRequestException e) {
                }
            }
        }
        public static void start() {
            // Create a Http server and start listening for incoming connections
            listener = new HttpListener();
            listener.Prefixes.Add(url);
            listener.Start();
            Console.WriteLine("Successfully connected to GSI Server!");

            // Handle requests
            Task listenTask = handleIncomingConnections();
            listenTask.GetAwaiter().GetResult();

            // Close the listener
            listener.Close();
        }
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
    }
}