$(document).ready(function(){
    /* Set Tooltip Information (Seperation of Concerns) */
    document.getElementById("hr-label").title =
    `<img src="static/markers/heart0.png" alt="Lowest Heartrate" style="display: inline-block;" width="10%" height="10%">
    - Lowest 
     
    <img src="static/markers/heart5.png" alt="Highest Heartrate" style="display: inline-block; margin:0px 0px 0px 10px" width="10%" height="10%">
    - Highest`
    document.getElementById("ele-label").title =
    `<img src="static/images/blue.png" alt="Low Elevation" style="display: inline-block;" width="10%" height="10%">
    Low 
    <img src="static/images/purple.png" alt="Medium Elevation" style="display: inline-block;" width="10%" height="10%">
    Med
    <img src="static/images/red.png" alt="High Elevation" style="display: inline-block;" width="10%" height="10%">
    High`;

    document.getElementById("cad-label").title = 
    `<img src="static/images/high-cad.png" alt="High Cadence" style="display: inline-block;"
     width="15%" height="15%"> High <img src="static/images/low-cad.png" alt="Low Cadence" 
     style="display: inline-block; margin-left:20px; " width="20%" height="20%">Low`;


    $('[data-toggle="tooltip"]').tooltip();

});