// --------------------------------
// Starfield (C) Mark Hindsbo, 2011
// --------------------------------

// Creates a starfield with numberStars of stars
// (startX, startY) is the upper left cornor of the canvas where starrfield starts and it is (width, height) in size
// chose (0,0) and (canvas width, canvas height) for starfield to fill the entire canvas
// direction = "x"/"y"/"z" indicating which axis stars are moving along. Velocity is in % of width/height/depth per second 
function StarField(context, numberStars, startX, startY, width, height, direction, velocity) {   
    this.context = context;                                                     // Context of Canvas on which stars are drawn
    this.startX = startX;
    this.startY = startY;
    this.startZ = 0;
    this.width = width;
    this.height = height;
    this.depth = 1000;
    this.sx = this.startX + (this.width / 2);                                   // X translation from star coordinates to canvas coordinates
    this.sy = this.startY + (this.height / 2);                                  // Y translation from star coordinates to canvas coordinates
    this.direction = direction;
    this.velocity = velocity;

    this.numStars = numberStars;
    this.stars = new Array(this.numStars);

    StarField.prototype.createStars = function () {
        switch (direction) {                                                    // Determine what speed is in absolute pixels, depending on dirtection
            case "x":
                this.velocity *= this.width / 1000;
                break;
            case "y":
                this.velocity *= this.width / 1000;
                break;
            default:
                this.velocity *= this.depth / 1000;
                break;
        }

        for (var i = 0; i < this.numStars; i++) {
            var star = new Array(3);
            star[0] = (Math.random() - 0.5) * 2 * this.width;                   // X coordinate of star goes from -width to width
            star[1] = (Math.random() - 0.5) * 2 * this.height;                  // Y coordinate of star goes from -height to height
            star[2] = Math.random() * this.depth;                               // Z coordinate of star 0 to depth
            star[3] = false;                                                    // Active. If false then star is not drawn
            this.stars[i] = star;                                               // add star to array
        }
    }

    StarField.prototype.draw = function (dt) {
        for (var i = 0; i < this.numStars; i++) {
            var color, radius;
            var p = this.pz(this.stars[i][2]);                                  // Determine projection factor based on z-value
            var x = this.stars[i][0] / p + this.sx;                             // Projected and translated x-value
            var y = this.stars[i][1] / p + this.sy;                             // projected and translated y-value


            if (this.visible(x,y) && this.stars[i][3]) {                        // Check if star is within visible field and active
                if (p < 1.25) {                                                 // Determine size and color of star depending on distance
                    radius = 5;
                    color = "rgba(255,255,255,1.0)"
                }
                else if (p < 1.5) {
                    radius = 4;
                    color = "rgba(192,192,192,1.0)"
                }
                else if (p < 1.75) {
                    radius = 3;
                    color = "rgba(128,128,128,1.0)"
                }
                else {
                    radius = 2;
                    color = "rgba(64,64,64,1.0)"
                }

                var gradient = this.context.createRadialGradient(x, y, 1, x, y, radius);
                gradient.addColorStop(0, color);
                gradient.addColorStop(1, "rgba(0,0,0,0.0)");
                this.context.fillStyle = gradient;
                this.context.fillRect(x - 5, y - 5, 11, 11);
            }
        }
    }

    StarField.prototype.update = function (dt) {
        var axis, limit1, limit2, boundaryCheck;                                        // Sets to the index of the direction stars are moving in. 0 = x, 1 = y, 2 = z;

        switch (this.direction) {                                                       // Determine the index of the axis the stars are moving along, the boundary values and to check for > or <
            case "x":
                axis = 0;
                if (this.velocity >= 0) {
                    limit1 = this.width;
                    limit2 = -limit1;
                    boundaryCheck = this.boundaryCheck1;
                }
                else {
                    limit1 = -this.width;
                    limit2 = -limit1;
                    boundaryCheck = this.boundaryCheck2;
                }
                break;
            case "y":
                axis = 1
                if (this.velocity >= 0) {
                    limit1 = this.height;
                    limit2 = -limit1;
                    boundaryCheck = this.boundaryCheck1;
                }
                else {
                    limit1 = -this.height;
                    limit2 = -limit1;
                    boundaryCheck = this.boundaryCheck2;
                }
                break;
            default:
                axis = 2;
                if (this.velocity >= 0) {
                    limit1 = this.depth;
                    limit2 = 0;
                    boundaryCheck = this.boundaryCheck1;
                }
                else {
                    limit1 = 0;
                    limit2 = this.depth;
                    boundaryCheck = this.boundaryCheck2;
                }
                break;
        }

        for (var i = 0; i < this.numStars; i++) {
            this.stars[i][axis] += this.velocity * dt;

            if (boundaryCheck(this.stars[i][axis], limit1)) {                           // If star is out of box then move to other side so it can come in again
                this.addBoundaryStar(i, axis, limit2);
            }
        }
    }

    StarField.prototype.boundaryCheck1 = function (value, limit) {                      // Function checks if value > limit. assigned dynamically when stars are moving with positive velocity
        if (value > limit) return true;
        else return false;
    }

    StarField.prototype.boundaryCheck2 = function (value, limit) {                      // Function checks if value < limit. assigned dynamically when stars are moving with negative velocity
        if (value < limit) return true;
        else return false;
    }

    StarField.prototype.addBoundaryStar = function (i, axis, limit) {                   // Adds a new star to the boundary at which they need to enter
        this.stars[i][axis] = limit;
        this.stars[i][3] = true;
    }

    StarField.prototype.pz = function (z) {                                             // Projection factor. pz(startZ) = 1, pz(startZ + depth) = 2.
        return ((z / this.depth) + 1);
    }

    StarField.prototype.visible = function (x, y) {
        if (x < this.StartX) return false;
        if (x >= this.startX + this.width) return false;
        if (y < this.StartY) return false;
        if (y >= this.startY + this.height) return false;
        return true;
    }

    this.createStars();
}