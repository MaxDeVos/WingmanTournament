using System;
using System.Diagnostics;
using System.Text.RegularExpressions;
using System.Threading;

// This is *really bad* code.

namespace WingmanRelay {
    public class MainClass {

        public static void Main(string[] args) {
            
            string[] text = System.IO.File.ReadAllLines("net-config.txt");
            
            // // Read a particular key from the config file 
            var gsiPort = text[0].Split(":")[1];
            var serverIP = text[1].Split(":")[1];
            var serverPort = text[2].Split(":")[1];
            
            
            var gsiUrl = "http://localhost:" + gsiPort + "/";
            var serverUrl = "http://" + serverIP + ":" + serverPort + "/";
            
            Console.WriteLine("Attempting GSI Address: " + gsiUrl);
            Console.WriteLine("Attempting Node Address: " + serverUrl);

            // This thread constantly loops and updated GSIThread.latestData with GSI data.
            new GSIThread(gsiPort);
            var gsi = new Thread(GSIThread.start);
            gsi.Start();
            
            var client = new RelayClient(serverUrl);
            client.start();
            
            //TODO This thing only works on localhost currently
            var sidesManager = new SidesManager();
        }
    }
}