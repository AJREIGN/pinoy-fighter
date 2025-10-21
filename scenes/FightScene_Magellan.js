import Phaser from "phaser";

export default class FightScene_Magellan extends Phaser.Scene {
    constructor() {
        super("FightScene_Magellan");
    }

    init(data) {
        this.selectedStage = data.selectedStage;
        this.playerWins = 0;
        this.enemyWins = 0;
        this.round = 1;
        this.difficulty = data.difficulty || "normal";
    }

    preload() {
        const stageMap = {
            "Kabukiran": "carbon_market",
            "Lasang": "lasang",
            "Kapatagan": "kapatagan",
            "Takipsilim": "takipsilim",
        };
        const stageFile = stageMap[this.selectedStage] || "carbon_market";
        this.load.image("stageBG", `/assets/stages/${stageFile}.png`);
        this.load.image("ground", "/assets/stages/ground.png");

        const charSheets = ["idle","run","jump","fall","attack1","attack2","special","hit","death"];
        charSheets.forEach(sheet => {
            this.load.spritesheet(`player_${sheet}`, `/assets/characters/magellan/${sheet}.png`, { frameWidth: 180, frameHeight: 180 });
        });

        const aiChoices = ["panday", "hunter", "lapulapu"];
        this.aiChar = Phaser.Utils.Array.GetRandom(aiChoices);
        charSheets.forEach(sheet => {
            this.load.spritesheet(`enemy_${sheet}`, `/assets/characters/${this.aiChar}/${sheet}.png`, { frameWidth: 180, frameHeight: 180 });
        });
    }

    create() {
        const { width, height } = this.cameras.main;
        this.add.image(width/2, height/2, "stageBG").setDisplaySize(width, height);
        this.physics.world.setBounds(0, 0, width, height);

        const groundY = height - 80;
        const ground = this.physics.add.staticSprite(width/2, groundY - 55, "ground").setScale(1);
        ground.refreshBody();

        this.player = this.createCharacter(300, groundY-100, "player");
        this.enemy = this.createCharacter(width-300, groundY-100, "enemy");

        this.physics.add.collider(this.player, ground);
        this.physics.add.collider(this.enemy, ground);

        this.keys = this.input.keyboard.addKeys({
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            up: Phaser.Input.Keyboard.KeyCodes.SPACE,
            attack1: Phaser.Input.Keyboard.KeyCodes.J,
            attack2: Phaser.Input.Keyboard.KeyCodes.K,
            special: Phaser.Input.Keyboard.KeyCodes.L
        });

        this.attackToggle = false;
        this.setupHealthBars(width);
        this.startRound();
    }

    createCharacter(x, y, prefix) {
        const char = this.physics.add.sprite(x, y, `${prefix}_idle`).setScale(2).setCollideWorldBounds(true);
        char.body.setGravityY(1000);
        char.body.setDragX(600);
        char.body.setMaxVelocity(300, 800);
        char.maxHealth = 100;
        char.health = 100;
        char.isDead = false;
        char.isAttacking = false;
        char.attackQueue = [];
        char.comboCount = 0;
        char.superMeter = 0;
        this.createAnimations(prefix);
        char.play(`${prefix}_idle`);
        return char;
    }

    createAnimations(prefix) {
        const anims = ["idle","run","jump","fall","attack1","attack2","special","hit","death"];
        anims.forEach(anim => {
            const frames = { start: 0, end: 9 }; // ensure spritesheets have 10 frames
            const rate = anim.includes("attack") ? 8 : anim==="hit"?6:10;
            const repeat = (anim==="idle"||anim==="run")?-1:0;
            this.anims.create({ key: `${prefix}_${anim}`, frames: this.anims.generateFrameNumbers(`${prefix}_${anim}`, frames), frameRate: rate, repeat });
        });
    }

    setupHealthBars(width) {
        const barWidth = 325, barHeight = 20;

        this.playerHealthBarBG = this.add.rectangle(20,40,barWidth,barHeight+8,0x222222).setOrigin(0,0.5).setStrokeStyle(3,0xffffff);
        this.playerHealthBar = this.add.rectangle(20,40,barWidth,barHeight,0x00ff00).setOrigin(0,0.5);
        this.playerNameText = this.add.text(20,70,"MAGELLAN",{fontFamily:"Arial Black",fontSize:20,color:"#fff",stroke:"#000",strokeThickness:4}).setOrigin(0,0.5);
        this.playerWinsText = this.add.text(20,80,"Wins: 0",{fontFamily:"Arial Black",fontSize:22,color:"#00ff00",stroke:"#000",strokeThickness:4}).setOrigin(0,0);

        this.enemyHealthBarBG = this.add.rectangle(width-20,40,barWidth,barHeight+8,0x222222).setOrigin(1,0.5).setStrokeStyle(3,0xffffff);
        this.enemyHealthBar = this.add.rectangle(width-20,40,barWidth,barHeight,0xff0000).setOrigin(1,0.5);
        this.enemyNameText = this.add.text(width-20,70,this.aiChar.toUpperCase(),{fontFamily:"Arial Black",fontSize:20,color:"#fff",stroke:"#000",strokeThickness:4}).setOrigin(1,0.5);
        this.enemyWinsText = this.add.text(width-20,80,"Wins: 0",{fontFamily:"Arial Black",fontSize:22,color:"#ff0000",stroke:"#000",strokeThickness:4}).setOrigin(1,0);

        this.vsText = this.add.text(width/2,50,"VS",{fontFamily:"Impact",fontSize:40,color:"#ffff00",stroke:"#000",strokeThickness:6}).setOrigin(0.5);
        this.timerText = this.add.text(width/2,100,"60",{fontFamily:"Arial Black",fontSize:32,color:"#ffff00",stroke:"#000",strokeThickness:6}).setOrigin(0.5);
        this.koText = this.add.text(width/2,this.cameras.main.height/2-50,"",{fontFamily:"Impact",fontSize:100,color:"#ff0000",stroke:"#000",strokeThickness:10,shadow:{offsetX:5,offsetY:5,color:"#000",blur:10,fill:true}}).setOrigin(0.5).setVisible(false);

        this.playerComboText = this.add.text(20,110,"Combo: 0",{fontFamily:"Arial Black",fontSize:20,color:"#ffff00",stroke:"#000",strokeThickness:4}).setOrigin(0,0);
        this.enemyComboText = this.add.text(width-20,110,"Combo: 0",{fontFamily:"Arial Black",fontSize:20,color:"#ffff00",stroke:"#000",strokeThickness:4}).setOrigin(1,0);
    }

    startRound() {
        const { width, height } = this.cameras.main;
        this.player.body.moves = false;
        this.enemy.body.moves = false;
        this.countdownActive = true;

        this.readyText = this.add.text(width/2,height/2,"ROUND "+this.round,{fontFamily:"Impact",fontSize:80,color:"#ffff00",stroke:"#ff9900",strokeThickness:8}).setOrigin(0.5);

        let count = 3;
        const countdown = this.time.addEvent({
            delay:1000, repeat:3,
            callback:()=>{
                if(count>0){ this.readyText.setText(count); count--; }
                else{
                    this.readyText.setText("FIGHT!");
                    this.player.body.moves = true;
                    this.enemy.body.moves = true;
                    this.countdownActive = false;
                    this.time.delayedCall(1000,()=>this.readyText.setVisible(false));
                }
            }
        });

        this.timeLeft = 60;
        this.timerText.setText(this.timeLeft);
        this.timerEvent = this.time.addEvent({
            delay:1000, loop:true,
            callback:()=>{
                if(this.timeLeft>0){ this.timeLeft--; this.timerText.setText(this.timeLeft); }
                else { if(!this.player.isDead && !this.enemy.isDead) this.drawFight(); this.timerEvent.remove(false); }
            }
        });
    }

    drawFight(){
        this.player.body.moves = false;
        this.enemy.body.moves = false;
        this.player.attackQueue = [];
        this.enemy.attackQueue = [];
        this.player.play("player_idle",true);
        this.enemy.play("enemy_idle",true);
        this.koText.setText("DRAW!");
        this.koText.setVisible(true);
        this.input.keyboard.enabled = false;
        this.playerWins++; this.enemyWins++;
        this.updateWinCounters();
        this.time.delayedCall(3000, ()=>{
            this.koText.setVisible(false);
            this.round++;
            if(this.playerWins>=2 && this.enemyWins>=2) this.endFight("DRAW GAME!");
            else this.resetRound();
        });
    }

    resetRound(){
        this.timeLeft=60; this.timerText.setText(this.timeLeft);
        this.player.x=300; this.enemy.x=this.cameras.main.width-300;
        this.player.body.moves=true; this.enemy.body.moves=true;
        this.input.keyboard.enabled=true;
        this.player.comboCount=0; this.enemy.comboCount=0;
        this.startRound();
    }

    updateWinCounters(){
        this.playerWinsText.setText("Wins: "+this.playerWins);
        this.enemyWinsText.setText("Wins: "+this.enemyWins);
        this.playerComboText.setText("Combo: "+this.player.comboCount);
        this.enemyComboText.setText("Combo: "+this.enemy.comboCount);
    }

    update(){
        if(this.countdownActive) return;
        this.handleAutoFace();
        this.handlePlayerInput();
        if(!this.enemy.isDead) this.handleEnemyAI();
    }

    handleAutoFace(){
        if(this.player.x < this.enemy.x){ this.player.flipX=false; this.enemy.flipX=true;}
        else{ this.player.flipX=true; this.enemy.flipX=false;}
    }

    handlePlayerInput(){
    const speed=220,jumpForce=-650;
    const { left,right,up,attack1,attack2,special } = this.keys;

    if(left.isDown){ this.player.setAccelerationX(-speed*2); if(this.player.body.onFloor()&&!this.player.isAttacking) this.player.play("player_run",true);}
    else if(right.isDown){ this.player.setAccelerationX(speed*2); if(this.player.body.onFloor()&&!this.player.isAttacking) this.player.play("player_run",true);}
    else { this.player.setAccelerationX(0); if(this.player.body.onFloor()&&!this.player.isAttacking) this.player.play("player_idle",true);}
    if(up.isDown && this.player.body.onFloor()){ this.player.setVelocityY(jumpForce); if(!this.player.isAttacking) this.player.play("player_jump",true);}
    if(!this.player.body.onFloor() && this.player.body.velocity.y>0 && !this.player.isAttacking) this.player.play("player_fall",true);

    // Queue attacks: jump attacks if airborne
    if(Phaser.Input.Keyboard.JustDown(attack1) && !this.player.isDead){
        if(!this.player.body.onFloor()) this.queueAttack(this.player,"jumpAttack",5);
        else this.queueAttack(this.player,"attack1",5);
    }
    if(Phaser.Input.Keyboard.JustDown(attack2) && !this.player.isDead){
        if(!this.player.body.onFloor()) this.queueAttack(this.player,"jumpAttack",7);
        else this.queueAttack(this.player,"attack2",7);
    }
    if(Phaser.Input.Keyboard.JustDown(special) && !this.player.isDead){
        if(!this.player.body.onFloor()) this.queueAttack(this.player,"jumpAttack",15);
        else this.queueAttack(this.player,"special",15);
    }

    if(!this.player.isAttacking) this.processAttackQueue(this.player);
}

    handleEnemyAI(){
        const aiSpeed=220;
        const dist=this.player.x-this.enemy.x;
        const absDist=Math.abs(dist);

        let attackChance,jumpChance,reactRange;
        switch(this.difficulty){
            case "easy": attackChance=3; jumpChance=0.005; reactRange=110; break;
            case "normal": attackChance=5; jumpChance=0.008; reactRange=130; break;
            case "hard": attackChance=10; jumpChance=0.015; reactRange=150; break;
            default: attackChance=5; jumpChance=0.008; reactRange=130;
        }

        if(!this.enemy.isAttacking){
            if(absDist>reactRange-30){ this.enemy.setAccelerationX(dist>0? aiSpeed*2 : -aiSpeed*2); if(this.enemy.body.onFloor()) this.enemy.play("enemy_run",true);}
            else { this.enemy.setAccelerationX(0); if(this.enemy.body.onFloor() && !this.enemy.anims.isPlaying) this.enemy.play("enemy_idle",true);}
        }

        if(this.enemy.body.onFloor() && Math.random()<jumpChance){ this.enemy.setVelocityY(-650); this.enemy.play("enemy_jump",true);}

        if(!this.enemy.isAttacking && absDist<reactRange && Phaser.Math.Between(0,100)<attackChance){
            const attackType = Phaser.Math.Between(0,10)<7 ? "attack1":"special";
            const damage = attackType==="attack1"?5:15;
            this.queueAttack(this.enemy,attackType,damage);
        }

        if(!this.enemy.isAttacking) this.processAttackQueue(this.enemy);
    }

    queueAttack(char,type,damage){
    let jumpAttack = false;
    if(type==="jumpAttack") jumpAttack = true;

    char.attackQueue.push({type,damage,jumpAttack});
    if(!char.isAttacking) this.processAttackQueue(char);
}

processAttackQueue(char){
    if(char.attackQueue.length===0){ char.isAttacking=false; return;}
    char.isAttacking=true;
    const {type,damage,jumpAttack}=char.attackQueue.shift();
    const animKey = (type==="attack1") ? (this.attackToggle?`${char===this.player?"player":"enemy"}_attack1`:`${char===this.player?"player":"enemy"}_attack2`) : `${char===this.player?"player":"enemy"}_special`;
    if(type==="attack1") this.attackToggle=!this.attackToggle;
    char.play(animKey,true);

    const hitDelay = (type.includes("attack") ? 200 : 300);
    this.time.delayedCall(hitDelay,()=>{
        const target = char===this.player? this.enemy: this.player;
        if(!target.isDead) this.hitCharacter(char,target,damage,jumpAttack);
    });

    char.once(Phaser.Animations.Events.ANIMATION_COMPLETE, ()=>{
        this.updateAnimationAfterAttack(char);
        this.time.delayedCall(50,()=>this.processAttackQueue(char));
    });
}

hitCharacter(attacker,target,damage,jumpAttack=false){
    if(target.isDead || attacker.isDead) return;

    // --- AIR INVULNERABILITY: only hit if on ground or jumpAttack ---
    if(!target.body.onFloor() && !jumpAttack) return;

    if(!target.hitQueue) target.hitQueue=[];
    target.hitQueue.push(damage);
    if(target.isProcessingHit) return;

    const processHit = ()=>{
        if(target.hitQueue.length===0){ target.isProcessingHit=false; return;}
        target.isProcessingHit=true;
        const dmg = target.hitQueue.shift();
        target.health -= dmg;
        target.comboCount++;
        if(target.health<0) target.health=0;

        target.setTint(0xff0000);
        this.time.delayedCall(100, ()=>{ if(!target.isDead) target.clearTint(); });

        if(target===this.player) this.playerHealthBar.width=(target.health/target.maxHealth)*325;
        else this.enemyHealthBar.width=(target.health/target.maxHealth)*325;

        this.updateWinCounters();

        if(target.health<=0){
            target.isDead=true;
            target.setVelocity(0);
            target.play(target===this.player?"player_death":"enemy_death",true);
            this.time.delayedCall(1000,()=>{ target===this.player?this.endFight("ENEMY WINS!"):this.endFight("PLAYER WINS!"); });
            return;
        }

        target.play(target===this.player?"player_hit":"enemy_hit",true);
        target.once(Phaser.Animations.Events.ANIMATION_COMPLETE, ()=>{
            if(target.isDead) return;
            if(!target.body.onFloor()){
                const jumpFallAnim = target.body.velocity.y<0 ? `${target===this.player?"player":"enemy"}_jump`:`${target===this.player?"player":"enemy"}_fall`;
                target.play(jumpFallAnim,true);
            } else target.play(target===this.player?"player_idle":"enemy_idle",true);
            this.time.delayedCall(50,processHit);
        });
    };
    processHit();
}

    updateAnimationAfterAttack(char){
        if(!char.body.onFloor()) char.play(char.body.velocity.y<0?`${char===this.player?"player":"enemy"}_jump`:`${char===this.player?"player":"enemy"}_fall`,true);
        else char.play(char===this.player?"player_idle":"enemy_idle",true);
    }

    endFight(result){
        this.player.body.moves=false; this.enemy.body.moves=false;
        this.koText.setText(result); this.koText.setVisible(true);
        this.time.delayedCall(3000, ()=>this.scene.start("SinglePlayerMenuScene"));
    }
}

