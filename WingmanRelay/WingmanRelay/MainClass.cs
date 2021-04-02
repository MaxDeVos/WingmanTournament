using System;
using System.Threading;
using System.Configuration;
using System.Collections.Specialized;

// This is *really bad* code.

namespace WingmanRelay {
    public class MainClass {

        public static void Main(string[] args) {
            
            string[] text = System.IO.File.ReadAllLines("net-config.txt");
            
            // Read a particular key from the config file 
            var gsiPort = text[0].Split(":")[1];
            var serverIP = text[1].Split(":")[1];
            var serverPort = text[2].Split(":")[1];


            var gsiUrl = "http://localhost:" + gsiPort + "/";
            var serverUrl = "http://" + serverIP + ":" + serverPort + "/";

            Console.WriteLine("Attempting GSI Address: " + gsiUrl);
            Console.WriteLine("Attempting Node Address: " + serverUrl);

            // This thread constantly loops and updated GSIThread.latestData with GSI data.
            new GSIThread(gsiPort);
            Thread gsi = new Thread(GSIThread.start);
            gsi.Start();

            RelayClient client = new RelayClient(serverUrl);
            client.start();
        }
    }
}