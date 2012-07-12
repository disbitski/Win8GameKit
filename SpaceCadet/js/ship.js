        

    function Ship(MAX_X, MAX_Y, MIN_ACCEL, MAX_ACCEL, LVL_MULTIPLY) {

        this.x = Math.random() * MAX_X;
        this.y = Math.random() * MAX_Y;

        var speed = randomRanged(MIN_ACCEL, MAX_ACCEL);
        var extra = speed * LVL_MULTIPLY;

        this.accel = speed + extra;
        this.img = new Image(); 
        this.img.src = randomImg();
        this.destroyed = false;
        this.destroyRendered = 0;
    };

    function randomRanged(a, b) {
        return (Math.floor(Math.random() * (1 + b - a))) + a;
    }

    function randomImg() {
        var images = Array(3);

        //TODO: new ship artwork
        images[0] = "/images/ship.png";
        images[1] = "/images/ship1.png";
        images[2] = "/images/ship2.png";
        images[3] = "/images/ship3.png";

        var ran = randomRanged(0, 3);

        return images[ran];
    }

