using System.Threading;

// This is *really bad* code.

namespace WingmanRelay {
    public class MainClass {

        public static void Main(string[] args) {
            const string url = "http://localhost:3000/";
            const string serverUrl = "http://localhost:3255/";

            // This thread constantly loops and updated GSIThread.latestData with GSI data.
            new GSIThread("3000");
            Thread gsi = new Thread(GSIThread.start);
            gsi.Start();

            RelayClient client = new RelayClient(serverUrl);
            client.start();
        }
    }
}