
/*
NOTE:
Phaser 'State' objects each contain a member variable "game" that acts as
a reference to the current game. This can be handy!
 */

// Default state lookup.
defaultState = {
    xPipe: 350,
    yPipe: 245
};

// Initialise Q matrix.
var QMatrix = new Array();
for (var i = 0; i<350; i++) {
    QMatrix[i] = new Array();

    for (var j = 0; j<350; j++) {
        QMatrix[i][j] = new Array();

        for (var k = 0; k<2; k++) {
            QMatrix[i][j][k] = 0;
        }
    }
}
console.log(QMatrix);

// QMatrix PARAMETERS
const alpha = 0.5;
const gamma = 1;
const reward = {
    alive: 15,
    dead: -1000
}
const action = {
    pass: 0,
    jump: 1
}



/*
Main class (Phaser.State implementation)

To be fed into Game class later on.
 */
class Main extends Phaser.State {

    constructor(){
        super();
    }

    /*
    preload()
    Phaser.State method override.

    This method is called first when a State object is 'started' in a Game context.
    It should only be used to load assets into the Loader and configure the display.
     */
    preload() {

        // DISPLAY CONFIG (found online)
        if(!this.game.device.desktop) {
            this.game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
            this.game.scale.setMinMax(this.game.width/2, this.game.height/2, this.game.width, this.game.height);
        }

        this.game.scale.pageAlignHorizontally = true;
        this.game.scale.pageAlignVertically = true;

        this.game.stage.backgroundColor = '#71c5cf';

        // Import pipe image.
        this.game.load.image('pipe', 'assets/pipe.png');

        // Import jump sound
        this.game.load.audio('jump', 'assets/jump.wav');

        // Import plane spritesheet.
        this.game.load.spritesheet('plane', 'assets/plane_scaled.png', 50, 43);
    }

    /*
    create()
    Phaser.State method override.

    This method is called after the preload is completed.
    It should be used to set up the initial state of the game, bringing in assets
    from the Loader and setting up any elements of the game that do not need to
    be changed dynamically.
     */
    create() {

        this.planeAlive = true;
        this.xPipe = defaultState.xPipe;
        this.yPipe = defaultState.yPipe;

        this.currentState = null;
        this.lastState = null;
        this.lastAction = null;

        this.refPipe = this.game.add.group();


        /* BASE CODE */
        // Use Phaser's ARCADE physics engine.
        this.game.physics.startSystem(Phaser.Physics.ARCADE);

        // Create a grouping for pipes sprites.
        this.pipes = this.game.add.group();

        //Add a row of pipes every 1700ms.
        this.timer = this.game.time.events.loop(1600, this.addRowOfPipes, this);

        this.plane = this.game.add.sprite(100, 245, 'plane');
        this.plane.frame = 0; //default sprite plane frame (upon import)
        this.game.physics.arcade.enable(this.plane);
        this.plane.body.gravity.y = 1000;

        // Animate the plane.
        this.plane.animations.add('motor', [0,1,2,1], 30, true);
        this.plane.animations.play('motor');

        // New anchor position for the plane on the screen.
        this.plane.anchor.setTo(-0.2, 0.5);

        // Add keyboard event listener functionality.
        // The space bar should represent a jump.
        var spaceKey = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
        spaceKey.onDown.add(this.jump, this);
        this.game.input.onDown.add(this.jump, this);

        // Initialize score variable and score counter on display.
        this.score = 0;
        this.labelScore = this.game.add.text(20, 20, "0", { font: "30px Arial", fill: "#ffffff" });

        // Add the jump sound.
        this.jumpSound = this.game.add.audio('jump');
        this.jumpSound.volume = 0.2;
        /* END BASE CODE */


    }

    /*
    update()
    Phaser.State method override.

    This method is called every frame once the state is running.
    It should be used for 'checking' and responding to dynamic aspects of the game,
    such as object collisions.
     */
    update() {

        // Check for collision and if plane is inside bounds.
        this.game.physics.arcade.overlap(this.plane, this.pipes, this.hitPipe, null, this);
        this.checkPlaneBounds();

        if (this.planeAlive) {

            // Calculate current x and y co-ords.
            this.currentState = [this.refPipe.position.x - this.plane.position.x,
                this.refPipe.position.y - this.plane.position.y]

            // SPECIAL CASE: start of program
            if (this.lastState == null) {
                this.lastState = this.currentState;
            }

            if (this.currentState != this.lastState) {

                // Update Q.
                var oldQ = QMatrix[this.lastState[0]][this.lastState[1]][this.lastAction];
                var newQ = alpha * (this.rewardIfAlive(this.planeAlive) + gamma + this.maxQ(this.currentState) - oldQ);
                QMatrix[this.lastState[0]][this.lastState[1]][this.lastAction] = newQ;

                // Decide next plane action.
                this.bestAction(this.currentState);

                // Set lastState to this new state.
                this.lastState = this.currentState;


            }

            // Slowly rotate the plane downward, up to a certain point.
            if (this.plane.angle < 20) {
                this.plane.angle += 1;
            }
        }

        else {
            this.restartGame();
        }

    }

    jump() {
        // If the plane is dead, he can't jump
        if (this.planeAlive == false)
            return;

        this.plane.body.velocity.y = -350;

        // Jump animation
        this.game.add.tween(this.plane).to({angle: -20}, 100).start();

        // Play sound
        this.jumpSound.play();
    }

    hitPipe() {
        // If the plane has already hit a pipe, we have nothing to do
        if (this.planeAlive == false)
            return;

        // Set the alive property of the plane to false
        this.planeAlive = false;

        // Prevent new pipes from appearing
        this.game.time.events.remove(this.timer);

        // Go through all the pipes, and stop their movement
        this.pipes.forEach(function(p){
            p.body.velocity.x = 0;
        }, this);
    }

    /*
    restartGame()
    Resets the game by starting the Main state over.
     */
    restartGame() {
        this.game.state.start('Main');
    }

    /*
    addOnePipe(x,y)
    x: x co-ord of pipe to add.
    y: y co-ord of pipe to add.
    Configures pipe behaviour, adds it to the game world and
    to the 'pipes' group.
     */
    addOnePipe(x, y, ref=false) {
        var pipe = this.game.add.sprite(x, y, 'pipe');
        this.pipes.add(pipe);
        this.game.physics.arcade.enable(pipe);

        if (ref == true) {
            this.refPipe.add(pipe);
        }

        pipe.body.velocity.x = -225;

        // Delete pipe when it moves off the display.
        pipe.checkWorldBounds = true;
        pipe.outOfBoundsKill = true;
    }

    /*
    addRowOfPipes()
    Uses the addOnePipe() function to add a row of pipes with
    a randomly assigned one-pipe gap.
     */
    addRowOfPipes() {
        var hole = Math.floor(Math.random()*5)+1;

        for (var i = 0; i < 8; i++) {
            if (i == hole + 2) {
                this.addOnePipe(400, i * 60 + 10, true);
            }

            else if (i != hole && i != hole + 1) {
                this.addOnePipe(400, i * 60 + 10);
            }
        }
        // Update the score variable and counter when a new row is added.
        this.score += 1;
        this.labelScore.text = this.score;
    }

    /*
    Q LEARN STUFF
     */


    /*
    checkPlaneBounds()
    Kills plane if out of bounds.
     */
    checkPlaneBounds() {
        if (this.plane.y < 0 || this.plane.y > this.game.world.height) {
            this.planeAlive = false;
        }
    }

    bestAction(coords) {
        var pass = QMatrix[coords[0]][coords[1]][action.pass];
        var jump = QMatrix[coords[0]][coords[1]][action.jump];

        if (pass >= jump) {
            this.lastAction = action.pass;
        }

        else if (pass < jump) {
            this.lastAction = action.jump;
            this.plane.jump();
        }
    }

    rewardIfAlive(bool) {
        if (bool) {return reward.alive}
        else {return reward.dead}
    }

    maxQ(coords) {
        var pass = QMatrix[coords[0]][coords[1]][action.pass];
        var jump = QMatrix[coords[0]][coords[1]][action.jump];

        return (pass >= jump ? pass : jump);
    }
}



/*
Game class (Phaser.Game implementation)

Contains all of the information for our game to execute.
 */
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