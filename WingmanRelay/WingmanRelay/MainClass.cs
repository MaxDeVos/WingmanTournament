namespace WingmanRelay {
    
    public class MainClass {
        
        public static void Main(string[] args)
        {
            var server = new GSIServer();
            server.start();
        }

    }
}