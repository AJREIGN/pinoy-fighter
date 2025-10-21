import Phaser from "phaser";

// 🎮 Import all your game scenes
import BootScene from "./scenes/BootScene.js";
import PreloadScene from "./scenes/PreloadScene.js";
import LoadingScreenScene from "./scenes/LoadingScreenScene.js";
import MenuScene from "./scenes/MenuScene.js";
import SinglePlayerMenuScene from "./scenes/SinglePlayerMenuScene.js";  
import ArcadeModeScene from "./scenes/ArcadeModeScene.js";
import StageSelectScene from "./scenes/StageSelectScene.js"; 
import FinalizationScene from "./scenes/FinalizationScene.js";
import FightScene_manigbasay from "./scenes/FightScene_manigbasay.js";
import FightScene_LapuLapu from "./scenes/FightScene_LapuLapu.js";
import FightScene_Magellan from "./scenes/FightScene_Magellan.js";
import FightScene_Panday from "./scenes/FightScene_Panday.js";



// 🧍 Global Player Manager (for local data)
export const playerManager = {
  data: JSON.parse(localStorage.getItem("playerData")) || null,
  set(data) {
    this.data = data;
    localStorage.setItem("playerData", JSON.stringify(data));
  },
  get() {
    return this.data;
  },
};

// 🎬 Add fade helpers to all scenes
Phaser.Scene.prototype.fadeToScene = function (targetScene, data = {}) {
  this.cameras.main.fadeOut(400, 0, 0, 0);
  this.cameras.main.once("camerafadeoutcomplete", () => {
    this.scene.start(targetScene, data);
  });
};

Phaser.Scene.prototype.fadeIn = function () {
  this.cameras.main.fadeIn(400, 0, 0, 0);
};

// ⚙️ Phaser Game Config
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game-container",
  scene: [
  BootScene,
  LoadingScreenScene,
  PreloadScene,
  MenuScene,
  SinglePlayerMenuScene,
  ArcadeModeScene,
  StageSelectScene,
  FinalizationScene,
  FightScene_manigbasay,
  FightScene_LapuLapu,
  FightScene_Magellan,
  FightScene_Panday
],
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 300 }, debug: false },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: "#000000",
};

// 🚀 Launch Game
new Phaser.Game(config);
