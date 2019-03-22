function InputManager() {
}

InputManager.prototype.initialize = function () {
	
	// state
	
	this.pointerLockScheduled = false;
	
	// api fix
	
	var canvas = render.canvas;
	canvas.requestPointerLock = 
		canvas.requestPointerLock ||
		canvas.mozRequestPointerLock ||
		canvas.webkitRequestPointerLock;
		
	document.exitPointerLock = 
		document.exitPointerLock ||
		document.mozExitPointerLock ||
		document.webkitExitPointerLock;
		
	var pointerLockEventName = undefined;
	if ('onpointerlockchange' in document) {
		pointerLockEventName = 'pointerlockchange';
	} else if ('onmozpointerlockchange' in document) {
		pointerLockEventName = 'mozpointerlockchange';
	} else if ('onwebkitpointerlockchange' in document) {
		pointerLockEventName = 'webkitpointerlockchange';
	}
		
	this.api = {
		pointerLock: 
			canvas.requestPointerLock !== undefined && 
			document.exitPointerLock !== undefined &&
			pointerLockEventName !== undefined,
	};
	
	// binds
	
	this.bind = {
		load: this.loadEvent.bind(this),
		resize: this.resizeEvent.bind(this),
		mousemove: this.mouseMoveEvent.bind(this),
		mousedown: this.mouseDownEvent.bind(this),
		mouseup: this.mouseUpEvent.bind(this),
		pointerLock: this.pointerLockEvent.bind(this),
		keydown: this.keyDownEvent.bind(this),
		keyup: this.keyUpEvent.bind(this),
		contextmenu: this.contextMenuEvent.bind(this),
		touchstart: this.touchStartEvent.bind(this),
		touchmove: this.touchMoveEvent.bind(this),
		touchend: this.touchEndEvent.bind(this),
	};
	
	// keys
	
	this.keyMap = [];
	
	// touch
	
	this.activeTouches = {};
	
	this.touchSide = "none";
	// TODO deduct from DPI?
	this.TAP_AREA_SIZE = 50; // pixels
		
	// events
	
	window.addEventListener("load", this.bind.load, { passive: true });
	window.addEventListener("resize", this.bind.resize, { passive: true });
	
	window.addEventListener("mousemove", this.bind.mousemove, { passive: true });
	window.addEventListener("mousedown", this.bind.mousedown, { passive: true });
	window.addEventListener("mouseup", this.bind.mouseup, { passive: true });
	
	window.addEventListener("keydown", this.bind.keydown, { passive: true });
	window.addEventListener("keyup", this.bind.keyup, { passive: true });
	
	window.addEventListener("touchstart", this.bind.touchstart, { passive: false });
	window.addEventListener("touchmove", this.bind.touchmove, { passive: false });
	window.addEventListener("touchend", this.bind.touchend, { passive: false });
	
	window.addEventListener("contextmenu", this.bind.contextmenu, { passive: false });
	
	if (this.api.pointerLock) {
		document.addEventListener(pointerLockEventName, this.bind.pointerLock, 
			{ passive: true });
	}
	
	this.lockMouse();
};

// pointer lock

InputManager.prototype.lockMouse = function () {	
	if (!this.api.pointerLock)
		return;
	
	if (!this.pointerLockScheduled) {	
		this.pointerLockScheduled = true;
		this.pointerLockInterval = setInterval(this.processMouseLock.bind(this), 10);
	}
	
	this.processMouseLock();
};

InputManager.prototype.unlockMouse = function () {
	if (!this.api.pointerLock)
		return;
	
	this.cancelPointerLockSchedule();
	
	document.exitPointerLock();
};

InputManager.prototype.processMouseLock = function () {
	if (!this.api.pointerLock)
		return;
	
	if (this.pointerLockScheduled) {
		var canvas = render.canvas;
		canvas.requestPointerLock();
	}
};

InputManager.prototype.cancelPointerLockSchedule = function () {
	
	if (this.pointerLockScheduled) {
		this.pointerLockScheduled = false;
		
		if (this.pointerLockInterval) {
			clearInterval(this.pointerLockInterval);
			delete this.pointerLockInterval;
		}
	}
};

// keys

InputManager.prototype.process = function (dt) {
	var movingVector = glMatrix.vec3.fromValues(0, 0, 0);
	
	var up = glMatrix.vec3.fromValues(0, 0, 1);
	var cameraRotation = render.getCameraRotation();
	
	var direction = render.calcDirectionFromAngles(cameraRotation[0], cameraRotation[1]);
	glMatrix.vec3.normalize(direction, direction);
	
	var sideDirection = glMatrix.vec3.create();
	glMatrix.vec3.cross(sideDirection, direction, up);
	glMatrix.vec3.normalize(sideDirection, sideDirection);
	
	var forwardDirection = direction;
	
	var KEY_W = 87;
	var KEY_S = 83;
	var KEY_D = 68;
	var KEY_A = 65;
	
	var ARROW_UP    = 38;
	var ARROW_DOWN  = 40;
	var ARROW_RIGHT = 39;
	var ARROW_LEFT  = 37;
	
	// forward
	if (this.keyMap[KEY_W] || this.keyMap[ARROW_UP] || this.touchSide === "forward")
		glMatrix.vec3.add(movingVector, movingVector, forwardDirection);
	
	// backward
	if (this.keyMap[KEY_S] || this.keyMap[ARROW_DOWN] || this.touchSide === "backward")
		glMatrix.vec3.subtract(movingVector, movingVector, forwardDirection);
	
	// right
	if (this.keyMap[KEY_D] || this.keyMap[ARROW_RIGHT] || this.touchSide === "right")
		glMatrix.vec3.add(movingVector, movingVector, sideDirection);
	
	// left
	if (this.keyMap[KEY_A] || this.keyMap[ARROW_LEFT] || this.touchSide === "left")
		glMatrix.vec3.subtract(movingVector, movingVector, sideDirection);
	
	glMatrix.vec3.normalize(movingVector, movingVector);
	
	var speed = 5.0;
	var positionDelta = speed * dt;
	var distanceVector = glMatrix.vec3.fromValues(
		positionDelta, positionDelta, positionDelta);
	glMatrix.vec3.mul(movingVector, movingVector, distanceVector);
	
	var cameraPosition = render.getCameraPosition();
	glMatrix.vec3.add(cameraPosition, cameraPosition, movingVector);
	
	render.setCameraPosition(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
};

// input handler

InputManager.prototype.processRotationInput = function (x, y) {
	var speed = 1 / 300;

	render.rotateCamera(y * speed, x * speed);
};

// touch

InputManager.prototype.createNewTouch = function (srcTouch) {
	
	var touch = {};
	
	touch.identifier = srcTouch.identifier + 100;
	touch.x = srcTouch.clientX;
	touch.y = srcTouch.clientY;
	touch.deltaSumX = 0;
	touch.deltaSumY = 0;
	touch.type = "none";
	
	console.assert(this.activeTouches[touch.identifier] === undefined);
	this.activeTouches[touch.identifier] = touch;
	
	touch.longTapDetectorTimer = setTimeout(function () {
		this.setupTouchSide(touch);
		this.setupTouchType(touch, "move");
		// notify all other touches
		Object.keys(this.activeTouches).forEach(function (identifier) {
			this.setupTouchType(this.activeTouches[identifier]);
		}.bind(this));
	}.bind(this), 300);	
	
	this.setupTouchType(touch);
};

InputManager.prototype.deleteTouch = function (touch) {
	this.cancelTouchLongTapTimer(touch);
	
	if (touch.type === "move") {
		this.touchSide = "none";
	}
	
	console.assert(this.activeTouches[touch.identifier] === touch);
	delete this.activeTouches[touch.identifier];
};

InputManager.prototype.cancelTouchLongTapTimer = function (touch) {
	if (touch.longTapDetectorTimer !== undefined) {
		clearTimeout(touch.longTapDetectorTimer);
		delete touch.longTapDetectorTimer;	
	}
};

InputManager.prototype.processTouch = function (touch, x, y) {
	var deltaX = touch.x - x;
	var deltaY = touch.y - y;
	
	touch.deltaSumX += deltaX;
	touch.deltaSumY += deltaY;
	
	this.setupTouchType(touch);
		
	if (touch.type == "rotation") {
		this.processRotationInput(-deltaX * 1.5, -deltaY * 1.5);
	}

	touch.x = x;
	touch.y = y;
};

InputManager.prototype.setupTouchType = function (touch, explicitType) {
	
	if (touch.type !== "none")
		return;
	
	var newType = "none";
	
	if (explicitType === undefined) {
		if (this.touchSide === "none") {
			var distanceMoved = Math.abs(touch.deltaSumX) + Math.abs(touch.deltaSumY);
			if (distanceMoved >= this.TAP_AREA_SIZE * 0.25) {
				newType = "rotation";
			}
		} else 
			newType = "rotation";
	} else {
		newType = explicitType;
	}
	
	if (newType === "none") 
		return;
	
	this.cancelTouchLongTapTimer(touch);	
	touch.type = newType;
};

InputManager.prototype.setupTouchSide = function (touch) {
	var x = touch.x - render.screenWidth / 2;
	var y = touch.y - render.screenHeight / 2;
	
	var aspectRatio = render.aspectRatio;
	var tapAreaSize = this.TAP_AREA_SIZE;
	
	x = Math.round(x / tapAreaSize);
	y = Math.round(y * aspectRatio / tapAreaSize);
	
	var s = -0.707;
	var c =  0.707;
	
	var offset = Math.min(render.screenWidth, render.screenHeight) * 0.1 / tapAreaSize;
	
    var rx = (x * c - y * s) + offset;
	var ry = (x * s + y * c) + offset;
	
	if (Math.sign(rx) === 1) {
		if (Math.sign(ry) === 1)
		    this.touchSide = 'forward';
		else
		    this.touchSide = 'right';
	} else {
		if (Math.sign(ry) === 1) 
		    this.touchSide = 'left';
		else
		    this.touchSide = 'backward';
	}
};

// events

InputManager.prototype.loadEvent = function (event) {
	this.processMouseLock();
};

InputManager.prototype.resizeEvent = function (event) {
	this.processMouseLock();
};

InputManager.prototype.mouseMoveEvent = function (event) {
	
	if (this.isPointerLocked) {
		var movementX = 
			event.movementX       ||
			event.mozMovementX    ||
			event.webkitMovementX ||
			0;

		var movementY = 
			event.movementY       ||
			event.mozMovementY    ||
			event.webkitMovementY ||
			0;
			
		this.processRotationInput(movementX, movementY);
	} else {
		this.processMouseLock();
	}
};

InputManager.prototype.mouseDownEvent = function (event) {	
	this.lockMouse();
};

InputManager.prototype.mouseUpEvent = function (event) {	
};

InputManager.prototype.pointerLockEvent = function (event) {
	var canvas = render.canvas;
	
	this.isPointerLocked = 
		(document.pointerLockElement       === canvas ||
		 document.mozPointerLockElement    === canvas ||
		 document.webkitPointerLockElement === canvas); 

	if (this.isPointerLocked)
		this.cancelPointerLockSchedule();
};

InputManager.prototype.keyDownEvent = function (event) {
	this.keyMap[event.keyCode] = true;
};

InputManager.prototype.keyUpEvent = function (event) {
	this.keyMap[event.keyCode] = false;
};

InputManager.prototype.contextMenuEvent = function (event) {
	event.preventDefault();
	return false;
};

InputManager.prototype.touchStartEvent = function (event) {
	
	event.preventDefault();
	
	if (event.changedTouches) {
		for (var index = 0; index < event.changedTouches.length; index++) {
			var srcTouch = event.changedTouches[index];
			var activeTouch = this.activeTouches[srcTouch.identifier + 100];
			if (!activeTouch)
				this.createNewTouch(srcTouch);
			else 
				console.warn("touch start with active identifier detected");
		}
	}
};

InputManager.prototype.touchMoveEvent = function (event) {
	
	event.preventDefault();
	
	if (event.changedTouches) {
		for (var index = 0; index < event.changedTouches.length; index++) {
			var srcTouch = event.changedTouches[index];
			var activeTouch = this.activeTouches[srcTouch.identifier + 100];
			if (activeTouch) {
				this.processTouch(activeTouch, srcTouch.clientX, srcTouch.clientY);
			}
		}
	}
};

InputManager.prototype.touchEndEvent = function (event) {
	
	event.preventDefault();
	
	if (event.changedTouches) {
		for (var index = 0; index < event.changedTouches.length; index++) {
			var srcTouch = event.changedTouches[index];
			var activeTouch = this.activeTouches[srcTouch.identifier + 100];
			if (activeTouch) {
				this.processTouch(activeTouch, srcTouch.clientX, srcTouch.clientY);
				this.deleteTouch(activeTouch);
			}
		}
	}
};