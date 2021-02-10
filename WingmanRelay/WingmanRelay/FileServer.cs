using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace WingmanRelay {
    internal class FileServer {
        // private HttpListener listener;
        private HttpClient client;
        
        private readonly string url;
        private readonly string serverUrl;

        public FileServer(string url) {
            this.url = url;
            serverUrl = url;
        }
        
        private string latestData = "";

        private static string getRequestData(HttpListenerRequest request) {
            if (!request.HasEntityBody) {
                Console.WriteLine("No client data was sent with the request.");
                return "";
            }

            Stream body = request.InputStream;
            Encoding encoding = request.ContentEncoding;
            var reader = new StreamReader(body, encoding);
            if (request.ContentType != null) {
            }

            // Convert the data to a string and display it on the console.
            var s = reader.ReadToEnd();

            body.Close();
            reader.Close();
            // If you are finished with the request, it should be closed also.
            return s;
        }

        private int i = 0;
        private async Task handleIncomingConnections() {

            // While a user hasn't visited the `shutdown` url, keep on handling requests

            var flag = true;
            
            while (flag) {

                try {
                    latestData = i + "HI MOM";
                    HttpResponseMessage m = await client.PostAsync(serverUrl, new StringContent(latestData));
                    i++;

                    Stream body = await m.Content.ReadAsStreamAsync();
                    var reader = new StreamReader(body);

                    // Convert the data to a string and display it on the console.
                    var s = reader.ReadToEnd();
                    Console.WriteLine(s);
                    flag = false;
                }
                catch (Exception e) {
                    Console.WriteLine("Failed To Connect");
                }


                // // Will wait here until we hear from a connection
                // HttpListenerContext ctx = await listener.GetContextAsync();
                //
                // // Peel out the requests and response objects
                // HttpListenerRequest req = ctx.Request;
                // HttpListenerResponse resp = ctx.Response;
                //
                // // If it starts with this, it is a request from the server
                // var response = getRequestData(req);
                // latestData = response;
                // Console.Write((latestData));
                // resp.Close();
            }
        }

        public void start() {
            // Create a Http server and start listening for incoming connections
            // listener = new HttpListener();
            // listener.Prefixes.Add(url);
            // listener.Start();
            Console.WriteLine("Listening for connections on {0}", url);
            client = new HttpClient();

            // Handle requests
            Task listenTask = handleIncomingConnections();
            listenTask.GetAwaiter().GetResult();

            // Close the listener
            // listener.Close();
        }
    }
}