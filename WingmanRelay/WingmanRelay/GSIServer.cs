using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;

namespace WingmanRelay
{
class GSIServer {
    
        private HttpListener listener;
        private HttpClient client;
        private string url = "http://localhost:3000/";
        private string serverUrl = "http://13.58.40.89:3254/";
        
        // public static string serverUrl = "http://localhost:3254/";
        private string latestData = "";
        private bool debugMode = false;

        private string getRequestData(HttpListenerRequest request)
        {
            if (!request.HasEntityBody)
            {
                Console.WriteLine("No client data was sent with the request.");
                return "";
            }
            var body = request.InputStream;
            var encoding = request.ContentEncoding;
            var reader = new System.IO.StreamReader(body, encoding);
            if (request.ContentType != null)
            {
            }

            // Convert the data to a string and display it on the console.
            var s = reader.ReadToEnd();

            body.Close();
            reader.Close();
            // If you are finished with the request, it should be closed also.
            return s;
        }

        private async Task handleIncomingConnections()
        {
            // While a user hasn't visited the `shutdown` url, keep on handling requests
            while (true)
            {
                // Will wait here until we hear from a connection
                var ctx = listener.GetContext();

                // Peel out the requests and response objects
                var req = ctx.Request;
                var resp = ctx.Response;

                // If it starts with this, it is a request from the server
                var response = getRequestData(req);
                latestData = response;
                await client.PostAsync(serverUrl, new StringContent(latestData));
                if (debugMode)
                {
                    Console.Write(latestData);

                }
                resp.Close();
            }
        }

        public void start()
        {
            // Create a Http server and start listening for incoming connections
            listener = new HttpListener();
            listener.Prefixes.Add(url);
            listener.Start();
            Console.WriteLine("Listening for connections on {0}", url);
            client = new HttpClient();

            // Handle requests
            var listenTask = handleIncomingConnections();
            listenTask.GetAwaiter().GetResult();

            // Close the listener
            listener.Close();
        }
    }
}
