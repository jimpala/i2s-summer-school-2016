


/*
NOTE:
Phaser's 'State' objects each contain a member variable "game" that acts as
a reference to the current game.
 */

class Main extends Phaser.State {

    constructor(){
        super();
    }

    preload() {

        if(!this.game.device.desktop) {
            this.game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
            this.game.scale.setMinMax(this.game.width/2, this.game.height/2, this.game.width, this.game.height);
        }

        this.game.scale.pageAlignHorizontally = true;
        this.game.scale.pageAlignVertically = true;

        this.game.stage.backgroundColor = '#71c5cf';

        this.game.load.image('pipe', 'assets/pipe.png');

        // Load the jump sound
        this.game.load.audio('jump', 'assets/jump.wav');

        // Load in spritesheet.
        this.game.load.spritesheet('plane', 'assets/plane_scaled.png', 50, 43);
    }

    create() {
        this.game.physics.startSystem(Phaser.Physics.ARCADE);

        this.pipes = this.game.add.group();
        this.timer = this.game.time.events.loop(1500, this.addRowOfPipes, this);

        this.plane = this.game.add.sprite(100, 245, 'plane');
        // Set default frame.
        this.plane.frame = 0;
        this.game.physics.arcade.enable(this.plane);
        this.plane.body.gravity.y = 1000;

        // Animate.
        this.plane.animations.add('motor', [0,1,2,1], 30, true);
        this.plane.animations.play('motor');

        // New anchor position
        this.plane.anchor.setTo(-0.2, 0.5);

        var spaceKey = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
        spaceKey.onDown.add(this.jump, this);
        this.game.input.onDown.add(this.jump, this);

        this.score = 0;
        this.labelScore = this.game.add.text(20, 20, "0", { font: "30px Arial", fill: "#ffffff" });

        // Add the jump sound
        this.jumpSound = this.game.add.audio('jump');
        this.jumpSound.volume = 0.2;
    }

    update() {
        if (this.plane.y < 0 || this.plane.y > this.game.world.height)
            this.restartGame();

        this.game.physics.arcade.overlap(this.plane, this.pipes, this.hitPipe, null, this);

        // Slowly rotate the plane downward, up to a certain point.
        if (this.plane.angle < 20)
            this.plane.angle += 1;
    }

    jump() {
        // If the plane is dead, he can't jump
        if (this.plane.alive == false)
            return;

        this.plane.body.velocity.y = -350;

        // Jump animation
        this.game.add.tween(this.plane).to({angle: -20}, 100).start();

        // Play sound
        this.jumpSound.play();
    }

    hitPipe() {
        // If the plane has already hit a pipe, we have nothing to do
        if (this.plane.alive == false)
            return;

        // Set the alive property of the plane to false
        this.plane.alive = false;

        // Prevent new pipes from appearing
        this.game.time.events.remove(this.timer);

        // Go through all the pipes, and stop their movement
        this.pipes.forEach(function(p){
            p.body.velocity.x = 0;
        }, this);
    }

    restartGame() {
        this.game.state.start('Main');
    }

    addOnePipe(x, y) {
        var pipe = this.game.add.sprite(x, y, 'pipe');
        this.pipes.add(pipe);
        this.game.physics.arcade.enable(pipe);

        pipe.body.velocity.x = -200;
        pipe.checkWorldBounds = true;
        pipe.outOfBoundsKill = true;
    }

    addRowOfPipes() {
        var hole = Math.floor(Math.random()*5)+1;

        for (var i = 0; i < 8; i++)
            if (i != hole && i != hole +1)
                this.addOnePipe(400, i*60+10);

        this.score += 1;
        this.labelScore.text = this.score;
    }
}

class Game extends Phaser.Game {

    constructor(){
        super(400, 490, Phaser.AUTO, "gameDiv");

        this.Main = new Main();

        this.state.add('Main', this.Main);

        this.state.start('Main');
    }
}

// Run the game!
// Can instantiate without a reference because we're in the global
// scope and hence it won't be destroyed.
new Game();