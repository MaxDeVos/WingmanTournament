﻿using System;
using System.Text.RegularExpressions;
using System.Threading;

// LEFT IS TERRORIST
// RIGHT IS COUNTER-TERRORIST
// FUCKING IRONIC, ISN'T IT

namespace WingmanRelay {
    public class SidesManager {
        
        private string leftName;
        private string rightName;

        public SidesManager() {
            Thread leftFinder = new Thread(determineTeams);
            leftFinder.Start();

            Thread bruhMoment = new Thread(checkForSwap);
            bruhMoment.Start();
        }

        private void determineTeams() {
            while (true) {
                try {
                    var request = new System.Net.Http.HttpClient();
                    var content = request.GetStringAsync(@"http://localhost:1348/api/match/current/").Result;

                    MatchCollection leftFinder = Regex.Matches(content, "(?<=left\":{\"id\":\").*?(?=\")");
                    if (leftFinder.Count != 0) {
                        leftName = getTeamNameFromID(leftFinder[0].ToString());
                        Console.WriteLine("Found Left Team! {0}", leftName);
                    }

                    MatchCollection rightFinder = Regex.Matches(content, "(?<=right\":{\"id\":\").*?(?=\")");
                    if (rightFinder.Count != 0) {
                        rightName = getTeamNameFromID(rightFinder[0].ToString());
                        Console.WriteLine("Found Right Team! {0}", rightName);
                    }
                    else {
                        Thread.Sleep(250);
                        continue;
                    }

                    break;
                }
                catch (AggregateException e) {
                    Console.WriteLine("Failed To Connect to Lexogrine!  Retrying in 1 second");
                }

            }
        }

        private string getTeamNameFromID(string id) {
            var request = new System.Net.Http.HttpClient();
            var content = request.GetStringAsync(@"http://localhost:1348/api/teams/" + id).Result;
            string name = content.Split(",")[0].Replace("{\"name\":\"", "").Replace("\"", "");
            return name;
        }

        public void checkForSwap() {
            while (true) {
                try {
                    var request = new System.Net.Http.HttpClient();
                    var response = request.GetStringAsync(@"http://localhost:1348/get-terrorist/").Result;
                    if (response == getCurrentGSICounterTerrorist()) {
                        Console.WriteLine("Swapping Teams!");
                        var swapRequest = new System.Net.Http.HttpClient();
                        request.GetStringAsync(@"http://localhost:1348/switch-teams/");
                    }

                    Thread.Sleep(100);
                }
                catch (Exception e) {
                    Console.WriteLine("Failed To Connect to Lexogrine!  Retrying in 1 second");
                    Thread.Sleep(1000);
                }

            }
        }
        
        private string getCurrentGSITerrorist() {
            // "(?<=team_t\":{).*?(?=},)"
            // Console.WriteLine(GSIThread.latestData);
            MatchCollection FBI = Regex.Matches(GSIThread.latestData, "(?<=\"team_t\": {)(.|\n)*?(?=})");
            if (FBI.Count != 0) {
                string teamData = FBI[0].ToString();
                MatchCollection CIA = Regex.Matches(teamData, "(?<=name\": \").*?(?=\",)");
                if (CIA.Count != 0) {
                    return CIA[0].ToString();
                }
            }

            return "nothing";
        }
        
        private string getCurrentGSICounterTerrorist() {
            // "(?<=team_t\":{).*?(?=},)"
            // Console.WriteLine(GSIThread.latestData);
            MatchCollection FBI = Regex.Matches(GSIThread.latestData, "(?<=\"team_ct\": {)(.|\n)*?(?=})");
            if (FBI.Count != 0) {
                string teamData = FBI[0].ToString();
                MatchCollection CIA = Regex.Matches(teamData, "(?<=name\": \").*?(?=\",)");
                if (CIA.Count != 0) {
                    return CIA[0].ToString();
                }
            }

            return "nothing";
        }
    }
}