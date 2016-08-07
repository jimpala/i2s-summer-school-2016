var game = new Phaser.Game(400, 490, Phaser.AUTO, "gameDiv");

var mainState = {

    preload: function() {
        if(!game.device.desktop) {
            game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
            game.scale.setMinMax(game.width/2, game.height/2, game.width, game.height);
        }

        game.scale.pageAlignHorizontally = true;
        game.scale.pageAlignVertically = true;

        game.stage.backgroundColor = '#71c5cf';

        game.load.image('pipe', 'assets/pipe.png');

        // Load the jump sound
        game.load.audio('jump', 'assets/jump.wav');

        // Load in spritesheet.
        game.load.spritesheet('plane', 'assets/plane_scaled.png', 50, 43);
    },

    create: function() {
        game.physics.startSystem(Phaser.Physics.ARCADE);

        this.pipes = game.add.group();
        this.timer = game.time.events.loop(1500, this.addRowOfPipes, this);

        this.plane = game.add.sprite(100, 245, 'plane');
        // Set default frame.
        this.plane.frame = 0;
        game.physics.arcade.enable(this.plane);
        this.plane.body.gravity.y = 1000;

        // Animate.
        this.plane.animations.add('motor', [0,1,2,1], 30, true);
        this.plane.animations.play('motor');

        // New anchor position
        this.plane.anchor.setTo(-0.2, 0.5);

        var spaceKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
        spaceKey.onDown.add(this.jump, this);
        game.input.onDown.add(this.jump, this);

        this.score = 0;
        this.labelScore = game.add.text(20, 20, "0", { font: "30px Arial", fill: "#ffffff" });

        // Add the jump sound
        this.jumpSound = game.add.audio('jump');
        this.jumpSound.volume = 0.2;
    },

    update: function() {
        if (this.plane.y < 0 || this.plane.y > game.world.height)
            this.restartGame();

        game.physics.arcade.overlap(this.plane, this.pipes, this.hitPipe, null, this);

        // Slowly rotate the plane downward, up to a certain point.
        if (this.plane.angle < 20)
            this.plane.angle += 1;
    },

    jump: function() {
        // If the plane is dead, he can't jump
        if (this.plane.alive == false)
            return;

        this.plane.body.velocity.y = -350;

        // Jump animation
        game.add.tween(this.plane).to({angle: -20}, 100).start();

        // Play sound
        this.jumpSound.play();
    },

    hitPipe: function() {
        // If the plane has already hit a pipe, we have nothing to do
        if (this.plane.alive == false)
            return;

        // Set the alive property of the plane to false
        this.plane.alive = false;

        // Prevent new pipes from appearing
        game.time.events.remove(this.timer);

        // Go through all the pipes, and stop their movement
        this.pipes.forEach(function(p){
            p.body.velocity.x = 0;
        }, this);
    },

    restartGame: function() {
        game.state.start('main');
    },

    addOnePipe: function(x, y) {
        var pipe = game.add.sprite(x, y, 'pipe');
        this.pipes.add(pipe);
        game.physics.arcade.enable(pipe);

        pipe.body.velocity.x = -200;
        pipe.checkWorldBounds = true;
        pipe.outOfBoundsKill = true;
    },

    addRowOfPipes: function() {
        var hole = Math.floor(Math.random()*5)+1;

        for (var i = 0; i < 8; i++)
            if (i != hole && i != hole +1)
                this.addOnePipe(400, i*60+10);

        this.score += 1;
        this.labelScore.text = this.score;
    },
};

game.state.add('main', mainState);
game.state.start('main'); 