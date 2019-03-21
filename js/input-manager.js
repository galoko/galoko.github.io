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
	};
	
	// keys
	
	this.keyMap = [];
		
	// events
	
	window.addEventListener("load", this.bind.load, { passive: true });
	window.addEventListener("resize", this.bind.resize, { passive: true });
	
	window.addEventListener("mousemove", this.bind.mousemove, { passive: true });
	window.addEventListener("mousedown", this.bind.mousedown, { passive: true });
	window.addEventListener("mouseup", this.bind.mouseup, { passive: true });
	
	window.addEventListener("keydown", this.bind.keydown, { passive: true });
	window.addEventListener("keyup", this.bind.keyup, { passive: true });
	
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
	
	var cameraRotation = render.getCameraRotation();
	
	// forward
	if (this.keyMap[87] || this.keyMap[38]) {
		var direction = render.calcDirectionFromAngles(
			cameraRotation[0], cameraRotation[1]);
			
		glMatrix.vec3.add(movingVector, movingVector, direction);
	}
	
	// back
	if (this.keyMap[83] || this.keyMap[40]) {
		var direction = render.calcDirectionFromAngles(
			cameraRotation[0] + Math.PI, cameraRotation[1]);
			
		glMatrix.vec3.add(movingVector, movingVector, direction);
	}
	
	/*
	// right
	if (this.keyMap[68] || this.keyMap[39]) {
		var direction = render.calcDirectionFromAngles(
			cameraRotation[0], cameraRotation[1] + Math.PI / 2);
			
		glMatrix.vec3.add(movingVector, movingVector, direction);
	}
	
	// left
	if (this.keyMap[65] || this.keyMap[37]) {
		var direction = render.calcDirectionFromAngles(
			cameraRotation[0], cameraRotation[1] - Math.PI / 2);
			
		glMatrix.vec3.add(movingVector, movingVector, direction);
	}
	*/
	
	glMatrix.vec3.normalize(movingVector, movingVector);
	
	var speed = 1.0;
	var positionDelta = speed * dt;
	var distanceVector = glMatrix.vec3.fromValues(
		positionDelta, positionDelta, positionDelta);
	glMatrix.vec3.mul(movingVector, movingVector, distanceVector);
	
	var cameraPosition = render.getCameraPosition();
	glMatrix.vec3.add(cameraPosition, cameraPosition, movingVector);
	
	render.setCameraPosition(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
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

		var speed = 1 / 300;

		render.rotateCamera(movementY * speed, movementX * speed);
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