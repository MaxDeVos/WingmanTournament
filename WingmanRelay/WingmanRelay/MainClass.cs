using System;
using WebSocketSharp;

namespace WingmanRelay {
    
    public class MainClass {

        public static void Main(string[] args) {
            const string url = "http://localhost:3000/";
            const string serverUrl = "http://localhost:3254/";
            
            var gsiServer = new GsiServer(url, serverUrl);
            gsiServer.start();
        }
    }
}