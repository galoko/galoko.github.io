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
		pointerLock: this.pointerLockEvent.bind(this)
	};
		
	// events
	
	window.addEventListener("load", this.bind.load, { passive: true });
	window.addEventListener("resize", this.bind.resize, { passive: true });
	
	if (this.api.pointerLock) {
		window.addEventListener("mousedown", this.bind.mousedown, { passive: true });
		document.addEventListener(pointerLockEventName, this.bind.pointerLock, 
			{ passive: true });
	}
	
	this.lockMouse();
};

InputManager.prototype.lockMouse = function () {	
	if (!this.api.pointerLock)
		return;
	
	if (!this.pointerLockScheduled) {	
		this.pointerLockScheduled = true;
		window.addEventListener("mousemove", this.bind.mousemove, { passive: true });
		this.pointerLockInterval = setInterval(this.processMouseLock.bind(this), 10);
	}
	
	this.processMouseLock();
};

InputManager.prototype.unlockMouse = function () {
	if (!this.api.pointerLock)
		return;
	
	if (this.pointerLockScheduled) {
		this.pointerLockScheduled = false;
		window.removeEventListener("mousemove", this.bind.mousemove);
		if (this.pointerLockInterval) {
			clearInterval(this.pointerLockInterval);
			delete this.pointerLockInterval;
		}
	}
	
	document.exitPointerLock();
};

InputManager.prototype.processMouseLock = function () {
	if (!this.api.pointerLock)
		return;
	
	if (this.pointerLockScheduled) {
		var canvas = render.canvas;
		canvas.requestPointerLock();
		console.log("trying to lock");
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
	this.processMouseLock();
};

InputManager.prototype.mouseDownEvent = function (event) {	
	this.lockMouse();
};

InputManager.prototype.pointerLockEvent = function (event) {
	var canvas = render.canvas;
	
	this.isPointerLocked = 
		(document.pointerLockElement       === canvas ||
		 document.mozPointerLockElement    === canvas ||
		 document.webkitPointerLockElement === canvas); 

	if (this.pointerLockScheduled && this.isPointerLocked) {
		this.pointerLockScheduled = false;
		window.removeEventListener("mousemove", this.bind.mousemove);
	}
};