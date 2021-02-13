using System;
using System.Diagnostics;
using WebSocketSharp;

namespace WingmanRelay {
    
    public class MainClass {

        public static void Main(string[] args) {
            const string url = "http://localhost:3000/";
            const string serverUrl = "http://localhost:3254/";
            
            var gsiServer = new GsiServer(url, serverUrl);
            
            Process[] processes = Process.GetProcessesByName("Lexogrine HUD Manager");
            if (processes.Length == 0) {
                Console.Write("Lexogrine is not running!  Starting it now!");
                gsiServer.startLexogrine();
            }
            
            Process[] csgo = Process.GetProcessesByName("csgo");
            if (csgo.Length == 0) {
                Console.Write("WARNING: CSGO is not running!");
            }
            
            gsiServer.start();
        }
    }
}