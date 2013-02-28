/// <reference path="sound.js" />
/// <reference path="ship.js" />
/// <reference path="starField.js" />

// Title: Space Cadet
// Version 1.1 Windows 8 RTM
// Desc: Fun Space Game to demonstrate Win8 Metro Style App using HTML5 Canvas, CSS3, 
//       Accelerometer, Camera, Touch, and Trial APIs
//
// Author: David Isbitski
//         Technology Evangelist, Windows 8
//         Microsoft
//
// Contact: david.isbitski@microsoft.com, twitter.com/thedavedev, blogs.msdn.com/davedev, github.com/disbitski, slideshare.net/disbitski
//
// Last Mod: 1/24/2013
//
// Special Thanks To:
//                      Mark Hindsbo - Developer of starField.js which is used in the Menu Screen
//
//                      Grant Skinner - Developer of SoundJS, whch is used throughout the game for sound effects
//                                      http://Soundjs.com
//
//                      Bob Familiar - Menu Screen music is called Hydrogen//[h] from Bob's Elements3 Album.
//                                     http://www.cdbaby.com/cd/BobFamiliar

(function () {
    "use strict";

    WinJS.Binding.optimizeBindingReferences = true;

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;

    //Version
    var GAME_VERSION = "1.1";

    //ship and screen constants
    var POINTS_SHIPHIT = 100;
    var SNAPPED_VIEW = 320;
    var SCREEN_WIDTH = 1366;
    var SCREEN_HEIGHT = 768;
    var FULLSCREEN_WIDTH = 1366;
    var SHIP_WIDTH = 190;
    var SHIP_HEIGHT = 100;
    var MAX_ACCEL = 17;
    var MIN_ACCEL = 7;
    var MAX_X;
    var MAX_Y;
    var MAX_SHIPS = 4;
    var DESTROYED_RENDER_FRAMES = 15;
    var LEVEL_RENDER_FRAMES = 10;
    var LEVEL_PTS_REQ = 2000;
    var LEVEL_SPEED_INCREASE = 0.1;
    var GRAVITY_WAVE_PTS_REQ = 1000; //1000 for rest, 4000 real gameplay


    //initial player score
    var score = 0;
    var scoreGravity = 0;

    //canvas and context
    var canvas;
    var ctx;

    //camera
    var capturedPhoto;

    //accelerometer
    var accelerometer;
    var intervalId = 0;
    var getReadingInterval = 0;

    //ships
    var ships = new Array(MAX_SHIPS);

    //error handler
    var errorMsg = "";

    //Trial Mode
    var isLicensed = false;

    //Starfield
    var stars;
    var screenHeight;
    var screenWidth;
    var thisTime;
    var deltaTime;
    var lastTime;

    //Game Mode
    var menuEnabled = true;

    //Menu Music
    var musicPlaying = false;
    var musicMenu = new Audio("/sounds/hydrogen.mp3");
    var musicGame = new Audio("/sounds/hydrogen.mp3");
    musicMenu.loop = true;
    musicGame.loop = true;
    
    //soundeffects
    var lasers = new Array();
    lasers[0] = "laser1";
    lasers[1] = "laser2";
    lasers[2] = "laser3";

    //animation handler
    var anim = null;

    //levels
    var lvlCurrent = 0;
    var lvlNextPts = LEVEL_PTS_REQ;
    var lvlDifficulty = LEVEL_SPEED_INCREASE;

    //Share Text
    var SHARE_TITLE = "Check out my Space Cadet score!";
        
    app.onactivated = function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                // TODO: This application has been newly launched. Initialize
                // your application here.
            } else {
                // TODO: This application has been reactivated from suspension.
                // Restore application state here.
            }
            args.setPromise(WinJS.UI.processAll());
        }
    };


    function gravityWave() {
        //playSound("gravitywave");
        for (var i = 0; i < MAX_SHIPS; i++) {
            ships[i] = destroyShip(ships[i]);
        }
    }

    //Accelerometer has been shaken and now we need to grant the bonus power
    function onShakenAccel(event) {
        //Stop Listening to Accelerometer
        accelerometer.removeEventListener("shaken", onShakenAccel);

        //Gravity Wave Power - Destory all ships
        gravityWave();

    }

    //Init Accelerometer
    function initAccel() {
        accelerometer = Windows.Devices.Sensors.Accelerometer.getDefault();
        if (accelerometer) {
            // Choose a report interval supported by the sensor
            var minimumReportInterval = accelerometer.minimumReportInterval;
            var reportInterval = minimumReportInterval > 16 ? minimumReportInterval : 16;
            accelerometer.reportInterval = reportInterval;
            getReadingInterval = reportInterval * 2; // double the interval for display (to reduce CPU usage)

        } else {
            displayError("No accelerometer found");
        }
    }


    function initLicense() {
        return true;
    }


    //onLoad Event
    function initialize() {
        //Init Canvas
        canvas = document.getElementById("canvas");
        ctx = canvas.getContext("2d");

        //CP bug - landscape mode retains snapped width. Backup full width first.
        FULLSCREEN_WIDTH = window.innerWidth;

        //Set up Coordinates for Screen Size
        //adjust for different screen sizes
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        SCREEN_HEIGHT = canvas.height;
        SCREEN_WIDTH = canvas.width;
        //Set boundries to be one ship size
        MAX_X = canvas.width - (SHIP_WIDTH + 20);
        MAX_Y = canvas.height - (SHIP_HEIGHT + 50);

        //Check Windows Store License
        isLicensed = initLicense();

        //Set up random location and speeds for all ships
        initShips();

        //Set up accelerometer for shake events
        initAccel();

        //Handle View Layout Changes
        //CP Windows.UI.ViewManagement.ApplicationView.getForCurrentView().addEventListener("viewstatechanged", onViewStateChanged);
        window.addEventListener("resize", onViewStateChanged);

        //Init starfield
        lastTime = new Date();
        lastTime = Number(lastTime.getTime());
        stars = new StarField(ctx, 500, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, "z", -0.2);

        //Init Sounds
        SoundJS.addBatch([
         { name: "redalert", src: "../sounds/redalert.mp3", instances: 1 },
         { name: "newlevel", src: "../sounds/newlevel.mp3", instances: 1 },
         { name: "pulse", src: "../sounds/pulse.mp3", instances: 1 },
         { name: "laser1", src: "../sounds/laser1.mp3", instances: 1 },
         { name: "laser2", src: "../sounds/laser2.mp3", instances: 1 },
         { name: "laser3", src: "../sounds/laser3.mp3", instances: 1 }]);


        //Handle Touch
        canvas.addEventListener("MSPointerUp", touchHandler, false);
        //Save state periodically
        app.addEventListener("checkpoint", applicationStateCheckpoint, false);
        //AppBar Commands
        document.getElementById("cmdCamera").addEventListener("click", capturePhoto, false);
        document.getElementById("cmdName").addEventListener("click", showCadetNameUpdate, false);
        document.getElementById("cmdHome").addEventListener("click", showMenu, false);
        document.getElementById("submitButton").addEventListener("click", updateCadetName, false);
        //Menu Commands
        document.getElementById("btnStart").addEventListener("click", startGame, false);

        //Share Contract
        var dataTransferManager = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
        dataTransferManager.addEventListener("datarequested", shareScore);

        //About and Privacy Policy Settings Charm
        WinJS.Application.onsettings = function (e) {
            e.detail.applicationcommands = {
                "aboutSettings": { title: "About Space Cadet", href: "/html/about.html" },
                "privacySettings": { title: "Privacy Policy", href: "/html/privacy.html" }
            };
            WinJS.UI.SettingsFlyout.populateSettings(e);
        };

        //Game Menu
        showMenu();

        //Game Loop - update, draw
        update();

        app.start();

    }

    //Set Up Menu Screen UI Elements
    function showMenu(event) {
        menuEnabled = true;

        txtPlayerName.style.visibility = "hidden";
        txtScore.style.visibility = "hidden";
        imgPlayer.style.visibility = "hidden";
        imgMenu.style.visibility = "visible";
        btnStart.style.visibility = "visible";
        txtVersion.innerHTML = GAME_VERSION;
        txtVersion.style.visibility = "visible";
        txtLevel.style.visibility = "hidden";

        //Detect View State
        if (event === 'snapped') {
            canvas.width = SNAPPED_VIEW;
        }
        else if (event === 'filled') {
            canvas.width = FULLSCREEN_WIDTH - SNAPPED_VIEW;
        }
        else {
            canvas.width = FULLSCREEN_WIDTH;
        }
        //Readjust canvas for Snapped/Filled modes
        canvas.height = window.innerHeight;
        SCREEN_HEIGHT = canvas.height;
        SCREEN_WIDTH = canvas.width;

        //Set boundries to be one ship size
        MAX_X = canvas.width - (SHIP_WIDTH + 20);
        MAX_Y = canvas.height - (SHIP_HEIGHT + 50);


        var menuX, btnX, btnY;
        menuX = (SCREEN_WIDTH - imgMenu.width) / 2;
        btnX = (SCREEN_WIDTH - btnStart.clientWidth) / 2;
        btnY = (SCREEN_HEIGHT - btnStart.clientHeight) / 2;

        imgMenu.style.posLeft = menuX;
        btnStart.style.posLeft = btnX;
        btnStart.style.posTop = btnY;

        //clear screen
        ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        musicGame.pause();
        musicMenu.play();

    }

    //Set up Game Screen UI Elements
    function startGame(event) {
        txtPlayerName.style.visibility = "visible";
        txtScore.style.visibility = "visible";
        imgPlayer.style.visibility = "visible";
        imgMenu.style.visibility = "hidden";
        btnStart.style.visibility = "hidden";
        txtVersion.style.visibility = "hidden";
        txtLevel.style.visibility = "visible";

        var lvlX = (SCREEN_WIDTH - txtLevel.clientWidth) / 2;
        txtLevel.style.posLeft = lvlX;

        musicMenu.pause();
        musicGame.play();

        menuEnabled = false;

    }

    //AppBar Camera Icon Event Handler
    function clickedPhoto(event) {
        capturePhoto();
    }

    //Change Cadet Name from Player1 to custom
    function updateCadetName(event) {
        txtPlayerName.innerHTML = document.getElementById("cadetName").value;
        document.getElementById("nameFlyout").winControl.hide();
    }

    function showCadetNameUpdate(event) {
        var cmdNameButton = document.getElementById("cmdName");
        document.getElementById("nameFlyout").winControl.show(cmdNameButton);
    }

    //Random acceleration speed
    function randomAccel(a, b) {
        return (Math.floor(Math.random() * (1 + b - a))) + a;
    }

    //Generate ship collection
    function initShips() {
        var ship;

        for (var i = 0; i < MAX_SHIPS; i++) {
            ship = new Ship(MAX_X, MAX_Y, MIN_ACCEL, MAX_ACCEL, lvlDifficulty);
            ship.img.onload = function () {
                ctx.drawImage(ship.img, ship.x, ship.y);
            }
            ships[i] = ship;
        }
    }

    //Save state of current x position
    function applicationStateCheckpoint() {
        //TODO: Save State
    }

    //Verify if point was within the bounds of an actual ship
    function touchHandler(event) {
        for (var i = 0; i < MAX_SHIPS; i++) {
            var ship = ships[i];
            if (shipHit(ship.x, ship.y, event.x, event.y)) {
                ships[i] = destroyShip(ship);
            }
        }
    }

    function destroyShip(ship) {

        var r = randomAccel(0, 2);
        var laserSound = lasers[r];
        SoundJS.play(laserSound, SoundJS.INTERRUPT_ANY);

        //TODO: Animation Explosion and better sound
        var explosion = new Image();
        explosion.onload = function () {
            ctx.drawImage(explosion, ship.x, ship.y);
        }
        explosion.src = "/images/explosion.png";
        ship.img = explosion;
        ship.destroyed = true;

        updateScore(POINTS_SHIPHIT);

        return ship;
    }

    function blowUpAnimation(ship) {
        if (ship.destroyRendered > DESTROYED_RENDER_FRAMES) {
            ship = new Ship(MAX_X, MAX_Y, MIN_ACCEL, MAX_ACCEL, lvlDifficulty);
        }
        else {
            ship.destroyRendered += 1;
        }
        return ship;
    }

    //Verify pixels clicked by pointer are within bounds of a ship's drawn pixels
    function shipHit(shipX, shipY, x, y) {
        var maxX = shipX + SHIP_WIDTH;
        var maxY = shipY + SHIP_HEIGHT;
        if (x >= shipX && x <= maxX && shipX >= 0 && y >= shipY && y <= maxY) {
            return true;
        }
        else {
            return false;
        }

    }

    //update player score
    function updateScore(points) {

        score += points;
        scoreGravity += points;
        txtScore.innerHTML = "  Score: " + score;

        if (scoreGravity === GRAVITY_WAVE_PTS_REQ) {
            if (accelerometer != null && accelerometer != undefined) {
                accelerometer.addEventListener("shaken", onShakenAccel);
                txtScore.innerHTML = " > SHAKE THAT SCREEN <";
                SoundJS.play("pulse", SoundJS.INTERRUPT_ANY);
            }
            scoreGravity = 0;
        }

        //new level
        lvlNextPts = (lvlCurrent + 1) * LEVEL_PTS_REQ;
        if (score >= lvlNextPts) {
            lvlCurrent++;
            txtLevel.innerHTML = "Level: " + lvlCurrent;
            lvlDifficulty = LEVEL_SPEED_INCREASE * lvlCurrent;

            SoundJS.play("newlevel", SoundJS.INTERUPT_ANY);

        }


    }


    //Game Loop to update x position of ship
    function update() {

        //RequestAnimationFrame faster pef than setInterval
        anim = window.msRequestAnimationFrame(update);

        if (menuEnabled) {
            drawStars();
        }
        else {
            //Game Loop
            updateShips();
            drawShips();
        }
    }

    //Render starfield to canvas
    function drawStars() {
        thisTime = new Date();
        thisTime = Number(thisTime.getTime());
        deltaTime = thisTime - lastTime;
        lastTime = thisTime;

        ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        stars.update(deltaTime);
        stars.draw(deltaTime);
    }

    //Render shipts to canvas
    function drawShips() {
        var ship;

        //clear each frame
        ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        //Render ships to canvas 
        for (var i = 0; i < MAX_SHIPS; i++) {
            ship = ships[i];
            ctx.drawImage(ship.img, ship.x, ship.y);
            if (ship.destroyed) {
                ships[i] = blowUpAnimation(ship);
            }

        }
    }

    //Play Sound Effect
    function playSound(sound) {
        setTimeout(function () {
            SoundJS.play(sound, SoundJS.INTERUPT_NONE, 1, false);
        }, 100);
    }

    //Move ship across screen based on that ships acceleration.
    //If ship has moved one ship length passed beginning of screen move it to beginning
    function updateShips() {
        var ship;
        for (var i = 0; i < MAX_SHIPS; i++) {
            ship = ships[i];
            if (ship.x <= -SHIP_WIDTH) {
                ship.x = SCREEN_WIDTH;
                ship.y = Math.random() * MAX_Y;
                ship[i] = ship;
            }
            ship.x += -ship.accel;
        }
    }

    //WinRT Camera API
    function capturePhoto() {
        try {
            var dialog = new Windows.Media.Capture.CameraCaptureUI();
            var aspectRatio = { width: 16, height: 9 };
            dialog.photoSettings.croppedAspectRatio = aspectRatio;
            dialog.captureFileAsync(Windows.Media.Capture.CameraCaptureUIMode.photo).then(function (file) {
                if (file) {
                    imgPlayer.src = URL.createObjectURL(file);

                } else {
                    //No Photo captured
                }
            }, function (err) {
                displayError(err);
            });
        } catch (err) {
            displayError(err);
        }
    }

    function displayError(err) {
        errorMsg = err;
    }

    function onViewStateChanged(eventArgs) {
        var viewStates = Windows.UI.ViewManagement.ApplicationViewState, msg;
        var newViewState = Windows.UI.ViewManagement.ApplicationView.value;
        if (newViewState === viewStates.snapped) {
            showMenu('snapped');
        } else if (newViewState === viewStates.filled) {
            showMenu('filled');
        } else if (newViewState === viewStates.fullScreenLandscape) {
            showMenu('landscape');
        } else if (newViewState === viewStates.fullScreenPortrait) {
            //Currently not supported
        }

    }

    //Share Contract for High Score
    function shareScore(e) {
        var request = e.request;
        var playername = document.getElementById("txtPlayerName");

        request.data.properties.title = SHARE_TITLE;
        request.data.setText('"' + playername.innerHTML + '" has reached ' + txtLevel.innerHTML + ' with' + txtScore.innerHTML + '!');

    }
    
    //If Document fully loaded than begin processing
    document.addEventListener("DOMContentLoaded", initialize, false);


    //app.oncheckpoint = function (args) {
    //    // TODO: This application is about to be suspended. Save any state
    //    // that needs to persist across suspensions here. You might use the
    //    // WinJS.Application.sessionState object, which is automatically
    //    // saved and restored across suspension. If you need to complete an
    //    // asynchronous operation before your application is suspended, call
    //    // args.setPromise().
    //};

    //app.start();
})();
