//=============================================================================
// SSG_DifficultySetting.js
// Version 1.0.0
//==============================================================================

/*:
 * @plugindesc SSG_Difficulty Setting
 * @author Heartbreak61
 * 
 * @help
 * ============================================================================
 *                 [Simple Stupid Gaming] Difficulty Setting
 *
 *                      file name: SSG_DifficultySetting.js
 *                                 ver 1.0.1
 *                              by Heartbreak61
 * ----------------------------------------------------------------------------
 * 
 * 
 * This plugin allows you to set difficulties that affects enemies stats, exp,
 * gold, and shop price. You can choose wether to display difficulty setting on
 * Game Option screen or not (default: on). In case you don't want to, you can 
 * switch difficulty levels using Event Plugin Command.
 * 
 * Before using this plugin, please make sure that you have file Difficulty.json
 * and place that file on the "data" folder of your current project. Edit your
 * Difficulty.json to your liking. You may add or remove difficulty levels as 
 * long as you follow the pattern.
 *
 * ============================================================================
 *                        DIFFICULTY.JSON EXPLANATION
 * ----------------------------------------------------------------------------
 *
 *                                ~~ name ~~
 *
 * Set your difficulty level name that will be displayed on the Option Screen.
 * Values must be a string (wrapped by quotes or double quotes sign).
 *
 * The tables is an Array. It means that the first element's ID is 0.
 * You should make your difficulty level sorted from easiest to hardest. As
 * it will make sense for the player when they set difficulty on the option
 * screen
 *
 *
 *              ~~ mhp, mmp, atk, def, atk, mat, mdf, agi, luk ~~
 * Set enemy's stats. Values represent percentage (100 is 100%)
 *
 *
 *                              ~~ exp, gold ~~
 * Set enemy's exp and gold. Values represent percentage
 *
 *
 *                              ~~ buy, sell ~~
 * Affect price when buying or selling items on the shop. Values represent
 * percentage
 *
 * 
 *                              ~~ switches ~~
 * Will specified set of switches to ON when a difficulty level applied.
 * Switches should be declared in array (i.e. [1,2,3]). If you don't want to
 * use this feature, just set it to [0]. Switches from other difficulty level
 * will be turned OFF but you can have same switches declared on different
 * difficulty level (See how I set switch 6 on difficulty 0 and 2 on the
 * example table below).
 * Please note that switches CAN'T be turned off using normal way.
 *
 *                      Author's Note About Switches:
 * In case you don't know, you can use switches for enemy skill condition.
 * So you can set an enemy to cast different skills on different difficulty
 * level.
 *
 * 
 * ============================================================================
 *                                PLUGIN COMMAND
 * ----------------------------------------------------------------------------
 *
 * To set difficulties using Plugin command, please write:
 *
 *     setDifficulty Number
 *     example: setDifficulty 4
 *
 * Using the example table below, it will set the difficulty level to very hard.
 * 
 * ============================================================================
 *                             SPECIFIC ENEMY SETTING
 * ----------------------------------------------------------------------------
 *
 * To override the table (for example, you find that 250% of DEF is too high
 * for certain enemies, you can write this line on enemy notebox
 *
 *		<param difficulty: difficultyLevel, param, value>
 *		example: <def_difficulty: 4, def, 250>
 * 
 * It will set enemy's DEF on difficulty 4 to 250%.
 *
 * Or you can write these lines for multiple assignment
 * 		<enemy difficulty>
 *		difficultyLevel, param, value
 *		difficultyLevel, param, value
 *		...
 *		</enemy difficulty>
 *
 *		example:
 * 		<enemy difficulty>
 *		3, atk, 150
 *		3, def, 125
 *		4, atk, 200
 *		...
 *		</enemy difficulty>
 *
 *
 * valid arguments for enemy stats is:
 *
 *     mhp, mmp, atk, def, mat, mdf, agi, luk, exp, gold
 *
 * Note: default parameter limiter for enemy will still be applied. For example,
 * you won't be able to set enemy's ATK to a value more than 999.
 *
 * ============================================================================
 *                                 TERM OF USE
 * ----------------------------------------------------------------------------
 *
 * Free to use on both commercial or non-commercial project as long as you
 * give credits to me. ;)
 *
 * ============================================================================
 *                                 CHANGELOG
 * ----------------------------------------------------------------------------
 * 2015.11.16 ver 0.9.9
 *   - Finished beta version
 *
 * 2015.11.26 ver 1.0.0
 *   - Added   : display on Option Screen
 *   - Added   : option to turn switches on
 *   - Changed : change from using Game_System to SSG_Heartbreak static class
 *
 *
 * 2015.11.27 ver 1.0.1
 *   - Fixed   : Load Config Manager after difficulty table has been completely
 *               loaded
 *               
 *
 * ============================================================================
 *                                 END OF HELP
 * ============================================================================
 * @param Show Difficulty Option
 * @desc Show Difficulty on Option Window
 * @default true
 *
 * @param Default Difficulty
 * @desc Your default starting difficulty level. This value will be replaced by game option save data.
 * @default 0
 */

(function() {
'use strict';

var parameters = PluginManager.parameters('SSG_DifficultySetting');
var showDiff = (parameters['Show Difficulty Option'].toLowerCase() === 'true') ? true : false;
var defDiff = Number(parameters['Default Difficulty'] || 0);

//==============================================================================
// Array.unique
Array.prototype.unique = function() {
	var o = {}, i, l = this.length, r = [];
	for (i=0; i<l; i++) o[this[i]] = this[i];
	for (i in o) r.push(o[i]);
	return r;
}

//==============================================================================
// SSG_Heartbreak
function SSG_Heartbreak() {
	throw new Error('This is Static Class')
}

SSG_Heartbreak.conversionTable = ['mhp','mmp','atk','def','mat','mdf','agi','luk','exp','gold'];
SSG_Heartbreak.difficultyTable = [];
SSG_Heartbreak.regexOverOn = /<enemy difficulty>/;
SSG_Heartbreak.regexOverOff = /<\/enemy difficulty>/;


SSG_Heartbreak.scanData = function(data, method){
	if (method==='difficulty'){
		for (var i = 0; i < data.length; i++){
			if (!!data[i]){
				this.createEnemyMultiplier(data[i]);
				this.scanNote(data[i], method);
			}
		}
	}
};

SSG_Heartbreak.scanNote = function(object, method) {
	if (method==='difficulty'){
		var _ary = object.note.split(/[\r\n]/);
		var _regex = /(\d+)\s*,\s*(\w+)\s*,\s*(\d+)/;
		var _regexTwo = /<param difficulty:\s*(\d+)\s*,\s*(\w+)\s*,\s*(\d+)>/;
		var _bool = false;
		for (var i = 0; i < _ary.length; i++){
			var _line = _ary[i];
			if (_line.match( _regexTwo )){
				var _found = _line.match(_regexTwo);
				var _dLv = Number(_found[1]);
				var _param = _found[2]; 
				var _value = Number(_found[3]);
				object.paramMultiplier[_dLv][_param] = _value;
			}
			if (_line.match( SSG_Heartbreak.regexOverOn )) {
				_bool = true;
				continue;
			}
			if (_line.match( SSG_Heartbreak.regexOverOff )) {
				_bool = false;
				continue;
			}
			if (_bool = true && !!_line.match(_regex)) {
				var _found = _line.match(_regex);
				var _dLv = Number(_found[1]);
				var _param = _found[2]; 
				var _value = Number(_found[3]);
				object.paramMultiplier[_dLv][_param] = _value;
			}
		}
	}
};

SSG_Heartbreak.createEnemyMultiplier = function(object){
	object.paramMultiplier = [];
	var table = SSG_Heartbreak.difficultyTable;
	var limit = SSG_Heartbreak.conversionTable.length;
	for (var i = 0; i < table.length; i++) {
	object.paramMultiplier[i] = {};
	var _keys = Object.keys(table[i]);
		for (var ii = 0; ii <= limit; ii++) {
			object.paramMultiplier[i][_keys[ii]] = table[i][_keys[ii]];
		}
	};
};

SSG_Heartbreak.loadDifficulty = function() {
    var xhr = new XMLHttpRequest();
    var url = 'data/Difficulties.json';
    xhr.open('GET', url);
    xhr.overrideMimeType('application/json');
    xhr.onload = function() {
        if (xhr.status < 400) {
			var str = xhr.responseText.replace(/[\r\n\t]/g,'');
			str = str.replace('],}', ']}');
			str = str.replace('},]', '}]');
			SSG_Heartbreak.difficultyTable = JSON.parse(str);
			SSG_Heartbreak.scanData($dataEnemies, "difficulty");
			console.log($dataEnemies);
			_ConfigManager_load.call(ConfigManager);
        }
    };
	xhr.onerror = function() {
		var str = 'Failed to load /data/Difficulties.json file!';
        throw new Error(str);
    };
    xhr.send();
};

//==============================================================================
// ConfigManager

var _ConfigManager_makeData = ConfigManager.makeData;
ConfigManager.makeData = function() {
	var config = _ConfigManager_makeData.call(this);
	config.difficulty = this.difficulty;
	return config;
};

var _ConfigManager_applyData = ConfigManager.applyData;
ConfigManager.applyData = function(config) {
	_ConfigManager_applyData.call(this, config);
	this.difficulty = this.readDifficulty(config, 'difficulty');
};

ConfigManager.readDifficulty = function(config, name) {
	var value = config[name];
    if (value !== undefined) {
		return value;
    } else {
        return defDiff;
    }
};

var _ConfigManager_load = ConfigManager.load;
ConfigManager.load = function(){
	SSG_Heartbreak.loadDifficulty();
	//_ConfigManager_load.call(this);
}

// ==============================================================================
// Game_Switches
var _Game_Switches_initialize = Game_Switches.prototype.initialize;
Game_Switches.prototype.initialize = function() {
	_Game_Switches_initialize.call(this);
	this.setDifficultySwitches();
};

var _Game_Switches_setValue = Game_Switches.prototype.setValue;
Game_Switches.prototype.setValue = function(switchId, value) {
	if (this._falseSwitches.contains(switchId)) { return; }
	_Game_Switches_setValue.call(this, switchId, value);
};

Game_Switches.prototype.setDifficultySwitches = function() {
	var table = SSG_Heartbreak.difficultyTable.slice();
	var diff = ConfigManager.difficulty;
	var swTrue = table[diff]["switches"] || [];
	this._falseSwitches = [];
	for (var i = 0; i < table.length; i++) {
		if (i === diff) { continue; }
		if ( !!table[i]["switches"] ) {
			this._falseSwitches.push(table[i]["switches"]);
		}
	}
	this._falseSwitches = this._falseSwitches.join().split(',').filter(function(m) {
		return !!m;}).unique();
	for (var i = 0; i < this._falseSwitches.length; i++) {
		this._falseSwitches[i] = Number(this._falseSwitches[i]);
		if (this._falseSwitches[i] > 0 && this._falseSwitches[i] < $dataSystem.switches.length) {
			this._data[this._falseSwitches[i]] = false;
		}
	}
	for (var i = 0; i < swTrue.length; i++) {
		this._data[swTrue[i]] = true;
	}
	if (!!$gameMap) this.onChange();
};


// ==============================================================================
// Game_Interpreter
var _Game_Interpreter_pluginCommand =
	Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
	_Game_Interpreter_pluginCommand.call(this, command, args);
	if (command.toLowerCase() === 'setdifficulty') {
		ConfigManager.difficulty = args[0];
		$gameSwitches.setDifficultySwitches();
		ConfigManager.save();
	}
};

// ==============================================================================
// Game_Enemy
Game_Enemy.prototype.difficultyMultiplier = function(key) {
	var diffLevel = ConfigManager.difficulty;
	var table = SSG_Heartbreak.difficultyTable;
	return table[diffLevel][key];
};

Game_Enemy.prototype.paramDifficultyFormula = function(id, value) {
	var mult, enemy = this.enemy(), dl = ConfigManager.difficulty;
	mult = enemy.paramMultiplier[dl][id];
	return Math.floor(value * mult / 100);
};

var _Game_Enemy_paramBase = Game_Enemy.prototype.paramBase;
Game_Enemy.prototype.paramBase = function(paramId) {
	var value = _Game_Enemy_paramBase.call(this, paramId);
	var key = SSG_Heartbreak.conversionTable[paramId];
	return this.paramDifficultyFormula(key, value);
};

var _Game_Enemy_exp = Game_Enemy.prototype.exp;
Game_Enemy.prototype.exp = function() {
	var value = _Game_Enemy_exp.call(this);
	return this.paramDifficultyFormula('exp', value);
};

var _Game_Enemy_gold = Game_Enemy.prototype.gold;
Game_Enemy.prototype.gold = function() {
	var value = _Game_Enemy_gold.call(this);
	return this.paramDifficultyFormula('gold', value);
};

// ==============================================================================
// Window_ShopBuy
var _Window_ShopBuy_price = Window_ShopBuy.prototype.price;
Window_ShopBuy.prototype.price = function(item){
	var value = _Window_ShopBuy_price.call(this, item),
	diffLevel = ConfigManager.difficulty,
	table = SSG_Heartbreak.difficultyTable,
	mult = table[diffLevel]['buy'];
	return Math.floor( value * mult / 100);
};

// ==============================================================================
// Scene_Shop
var _Scene_Shop_sellingPrice = Scene_Shop.prototype.sellingPrice;
Scene_Shop.prototype.sellingPrice = function() {
	var value = _Scene_Shop_sellingPrice.call(this),
	diffLevel = ConfigManager.difficulty,
	table = SSG_Heartbreak.difficultyTable,
	mult = table[diffLevel]['sell'];
	return Math.floor( value * mult / 100);
};

// ==============================================================================
// Window_Options
if (showDiff) {
	var _Window_Options_makeCommandList = Window_Options.prototype.makeCommandList;
	Window_Options.prototype.makeCommandList = function() {
		_Window_Options_makeCommandList.call(this);
		this.addCommand('Difficulty', 'difficulty');
	};

	var _Window_Options_statusText = Window_Options.prototype.statusText;
	Window_Options.prototype.statusText = function(index) {
		var symbol = this.commandSymbol(index);
		var value = this.getConfigValue(symbol);
		if (symbol === 'difficulty') {
			return SSG_Heartbreak.difficultyTable[value]['name'];
		}
		return _Window_Options_statusText.call(this, index);
	};
	
	var _Window_Options_processOk = Window_Options.prototype.processOk;
	Window_Options.prototype.processOk = function() {
		var index = this.index();
		var symbol = this.commandSymbol(index);
		var value = this.getConfigValue(symbol);
		var max = SSG_Heartbreak.difficultyTable.length - 1
		if (symbol === 'difficulty') {
			value = value.clamp(0, max);
			this.changeValue(symbol, value);
		} else {
			_Window_Options_processOk.call(this);
		}
	};
	
	var _Window_Options_cursorRight = Window_Options.prototype.cursorRight;
	Window_Options.prototype.cursorRight = function(wrap) {
		var index = this.index();
		var symbol = this.commandSymbol(index);
		var value = this.getConfigValue(symbol);
		var max = SSG_Heartbreak.difficultyTable.length - 1
		if (symbol === 'difficulty') {
			value++;
			value = value.clamp(0, max);
			this.changeValue(symbol, value);
			$gameSwitches.setDifficultySwitches()
		} else {
			_Window_Options_cursorRight.call(this, wrap);
		}
	};
	
	var _Window_Options_cursorLeft = Window_Options.prototype.cursorLeft;
	Window_Options.prototype.cursorLeft = function(wrap) {
		var index = this.index();
		var symbol = this.commandSymbol(index);
		var value = this.getConfigValue(symbol);
		var max = SSG_Heartbreak.difficultyTable.length - 1
		if (symbol === 'difficulty') {
			value--;
			value = value.clamp(0, max);
			this.changeValue(symbol, value);
			$gameSwitches.setDifficultySwitches()
		} else {
			_Window_Options_cursorLeft.call(this, wrap);
		}
	};

}; //if (showDiff)

//==============================================================================
})(); // (function() {
var Imported = Imported || {};
Imported['SSG Difficulty Setting'] = '1.0.0';
