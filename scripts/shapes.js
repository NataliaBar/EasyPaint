var defaultColor = "#FDFDFD";

// Main constructor (class)
function Shape(name, point1, point2, style) {
  
  this.constants = { ancorSize: 8, tolerance: 4, minShapeSize: 5 };
  
  this.style = style || {};
  this.styleSelected = {
    borderColor: "#FFFF00",
    borderWidth: 5,
  }
  this.name = name;
  this.isSelected = false;
  
  // Set a default style
  this.style.fillColor   = this.style.fillColor   || defaultColor;
  this.style.borderColor = this.style.borderColor || "#000000";
  this.style.borderStyle = this.style.borderStyle || "solid";
  this.style.borderWidth = this.style.borderWidth || 1; 
  
  this.updateGeometry(point1, point2);
}

Shape.prototype.draw = function(ctx) {
  
  // Set style
  ctx.strokeStyle = this.isSelected ? this.styleSelected.borderColor : this.style.borderColor;
  ctx.lineWidth = this.style.borderWidth;
  ctx.fillStyle = this.style.fillColor;
  ctx.setLineDash(this.getBorderStyle());
  
  // Start drawing
  ctx.beginPath();
  ctx.moveTo(this.geometry[0].x, this.geometry[0].y);

  for (var i = 1; i < this.geometry.length; i++) {
    ctx.lineTo(this.geometry[i].x, this.geometry[i].y);
  }

  if (this.style.fillColor != defaultColor)
    ctx.fill();

  // Finish draw
  ctx.stroke();

  // Draw a bounding box and anchors 
  if (this.isSelected) {
    this.drawBoundingBox(ctx);
    this.drawAnchors(ctx);
  }
}

// Get chosen border style and set it according to border width
Shape.prototype.getBorderStyle = function() {  
  var borderWidth = Math.max(2, this.style.borderWidth);
  var result = [];
    
  switch(this.style.borderStyle) {
    case "solid":
      result = [0];
      break;
    case "dashes":
      result = [borderWidth * 2, borderWidth];
      break;
    case "dots":
      result = [borderWidth];
      break;
    default:
      result = [0];
  }

  return result;
}

// Set status of selection
Shape.prototype.setSelected = function (isSelected) {
  this.isSelected = isSelected;
  // Calculate the bounding box for the selected item and update anchors geometry
  this.boundingBox = this.calculateBoundingBox(this.geometry);
  this.updateAnchors(); 
}

// Calculate geometry of a shape's bounding box
Shape.prototype.calculateBoundingBox = function (geometry) {
  // Get geometry of a shape
  var arr = geometry;
  var x = arr[0].x;
  var y = arr[0].y;

  // Set initial values of min and max coordinates
  var minX = x, minY = y;
  var maxX = x, maxY = y;

  // Find min and max coordinates of the shape
  for (var i = 1; i < arr.length; i++) {
    x = arr[i].x;
    y = arr[i].y;
    minX = x < minX ? x : minX;
    minY = y < minY ? y : minY;
    maxX = x > maxX ? x : maxX;
    maxY = y > maxY ? y : maxY;
  }

  // Calculate and set a bounding box geometry
  var width = Math.abs(maxX - minX);
  var height = Math.abs(maxY - minY);
  var center = { x: maxX - width / 2, y: maxY - height / 2};
  var boundingBox = { pointMin: {x: minX, y: minY},
                      pointMax: {x: maxX, y: maxY},
                      center:   center,
                      width:    width,
                      height:   height};
  
  return boundingBox;
}

// Draw a bounding box
Shape.prototype.drawBoundingBox = function(ctx) {
  var point  = this.boundingBox.pointMin;
  var width  = this.boundingBox.width;
  var height = this.boundingBox.height;
  var color = "#666666";

  // Set style
  ctx.setLineDash([4, 2]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = color;

  // Draw
  ctx.beginPath();
  ctx.rect(point.x, point.y, width, height);
  ctx.stroke();   
}

// Set anchors geometry using a bounding's box geometry
Shape.prototype.updateAnchors = function() {
  if (!this.isSelected) {
    this.selectedAnchor = undefined;
    return;
  }

  var boundingBox = this.boundingBox;
  this.anchors = [{ x: boundingBox.pointMin.x, y: boundingBox.pointMin.y }, 
                  { x: boundingBox.pointMax.x, y: boundingBox.pointMax.y }];
}

// Draw anchors
Shape.prototype.drawAnchors = function(ctx) {
  var anchorSize;
  var selectedAnchorSize = this.constants.ancorSize * 1.7;
  var color = "#666666"

  // Set style for anchors
  ctx.fillStyle = color;

  // Draw anchors
  for(var i = 0; i < this.anchors.length; i++) {
    // Set size for selected and non-selected anchor
    anchorSize = i == this.selectedAnchor ? selectedAnchorSize : this.constants.ancorSize;

    ctx.beginPath();
    ctx.rect((this.anchors[i].x - anchorSize / 2), (this.anchors[i].y - anchorSize / 2), anchorSize, anchorSize);
    ctx.fill();
  }
}

// Find out if a shape is closed or open
Shape.prototype.isClosedGeometry = function() {
  var firstShapePoint = this.geometry[0];
  var lastShapePoint  = this.geometry[this.geometry.length - 1];

  var result = firstShapePoint.x == lastShapePoint.x && firstShapePoint.y == lastShapePoint.y;

  return result;
}

// Hit test
Shape.prototype.hitTest = function(point) {
  var x = point.x;
  var y = point.y;
  var tolerance = this.constants.tolerance;
  var ancorR = this.constants.ancorSize / 2;
  var arr = this.geometry;
  var anchors = this.anchors;
  var inside = false;

  // Check if an anchor was hit
  if (this.isSelected) {
    for (var i = 0; i < anchors.length; i++) {
      var a = anchors[i];
      if (x >= (a.x - ancorR) && x <= (a.x + ancorR) && 
          y >= (a.y - ancorR) && y <= (a.y + ancorR)) {
        this.selectedAnchor = i;
        return true;
      }
    }
  }

  this.selectedAnchor = undefined;

  // Check if an open shape was hit
  if (!this.isClosedGeometry()) {
    for (var i = 0; i < arr.length - 1; i++) {
      var point1 = arr[i];
      var point2 = arr[i+1];
      var minX = Math.min(point1.x, point2.x);
      var minY = Math.min(point1.y, point2.y);
      var maxX = Math.max(point1.x, point2.x);
      var maxY = Math.max(point1.y, point2.y);

      var dx = point2.x - point1.x;
      var dy = point2.y - point1.y;
      var distance = Math.abs(dy * x - dx * y + point2.x * point1.y - point2.y * point1.x) / Math.sqrt(Math.pow(dy, 2) + Math.pow(dx, 2));

      if (distance < 5 &&
          x >= (minX - tolerance) &&
          x <= (maxX + tolerance) &&
          y >= (minY - tolerance) &&
          y <= (maxY + tolerance)) {
        inside = true;
        break;
      }
    }
  }
  // Check if a closed shape was hit
  else {
    for (var i = 0, j = arr.length - 1; i < arr.length; j = i++) {
      var xi = arr[i].x, yi = arr[i].y;
      var xj = arr[j].x, yj = arr[j].y;

      var intersects = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

      if (intersects)
        inside = !inside;
    }
  }

  return inside;
}

// Move or resize a shape
Shape.prototype.updateByDelta = function(dx, dy) { 
  // Resize shape
  if (this.selectedAnchor >= 0) {
    // Move selected anchor
    var ancor = this.anchors[this.selectedAnchor];
    ancor.x += dx;
    ancor.y += dy;

    // Calculate new bounding box
    var boundingBox1 = this.boundingBox;
    var boundingBox2 = this.calculateBoundingBox(this.anchors);   
    var minShapeSize = this.constants.minShapeSize;

    if (boundingBox2.width < minShapeSize || boundingBox2.height < minShapeSize) {
      ancor.x -= dx;
      ancor.y -= dy;
    }
    else {
      var sx = boundingBox2.width / boundingBox1.width;
      var sy = boundingBox2.height / boundingBox1.height;

      // Update shape's geometry accordingly
      this.geometry.forEach(function(element, index) {
        element.x = (element.x - boundingBox1.center.x) * sx + boundingBox2.center.x;
        element.y = (element.y - boundingBox1.center.y) * sy + boundingBox2.center.y;
      });
    }
  }
  // Move shape
  else { 
    this.geometry.forEach(function(element, index) {
      element.x += dx;
      element.y += dy;
    });
  }

  // Update bounding box and anchors according to a new geometry of a shape
  this.boundingBox = this.calculateBoundingBox(this.geometry);
  this.updateAnchors();
}

// Subclasses of Shape:

function Scribble(name, point1, point2, style) {
  Shape.call(this, name, point1, point2, style);
}

Scribble.prototype = Object.create(Shape.prototype);
Scribble.prototype.constructor = Scribble;

Scribble.prototype.updateGeometry = function updateGeometry(point1, point2) {
  if (!this.geometry) 
    this.geometry = [point1];
  else
    this.geometry.push(point2);
}

function Polyline(name, point1, point2, style) {
  Shape.call(this, name, point1, point2, style);    
}

Polyline.prototype = Object.create(Shape.prototype);
Polyline.prototype.constructor = Polyline;

Polyline.prototype.updateGeometry = function updateGeometry(point1, point2, updateType) {
  if (!this.geometry)
    this.geometry = [point1, point2];
  else if (updateType == "creatingMouseMove") {
    this.geometry[this.geometry.length - 1] = point2;
  }
  else {
    this.geometry.push(point2);
  }
}

function Ellipse(name, point1, point2, style) {
  Shape.call(this, name, point1, point2, style);
}

Ellipse.prototype = Object.create(Shape.prototype);
Ellipse.prototype.constructor = Ellipse;

Ellipse.prototype.updateGeometry = function updateGeometry(point1, point2) {
  var centerX = (point1.x + point2.x) / 2;
  var centerY = (point1.y + point2.y) / 2;
  var radius1 = Math.abs(centerX - point1.x)
  var radius2 = Math.abs(centerY - point1.y);

  var samplesCount = 60;
  var currentAngle = 0;
  var angleDelta   = 2 * Math.PI / samplesCount;
  var result = [];

  for (var i = 0; i < samplesCount; i++) {
    result[i] = {
      x: centerX + Math.cos(currentAngle) * radius1,
      y: centerY + Math.sin(currentAngle) * radius2
    }

    currentAngle += angleDelta;
  }
    
  result.push(Object.assign({}, result[0]));

  this.geometry = result;
}

function Rectangle(name, point1, point2, style) {
  Shape.call(this, name, point1, point2, style);
}

Rectangle.prototype = Object.create(Shape.prototype);
Rectangle.prototype.constructor = Rectangle;

Rectangle.prototype.updateGeometry = function updateGeometry(point1, point2) {
  var result = [{x: point1.x, y: point1.y},
                {x: point2.x, y: point1.y},
                {x: point2.x, y: point2.y},
                {x: point1.x, y: point2.y},
                {x: point1.x, y: point1.y}];

  this.geometry = result;
}

function Polygon(name, point1, point2, style) {
  Shape.call(this, name, point1, point2, style);
}

Polygon.prototype = Object.create(Shape.prototype);
Polygon.prototype.constructor = Polygon;

Polygon.prototype.updateGeometry = function updateGeometry(point1, point2, updateType) {
  if (!this.geometry)
    this.geometry = [point1, point2];
  else if (updateType == "creatingMouseMove") {
    this.geometry[this.geometry.length - 1] = point2;
  }
  else if (updateType == "creatingMouseDown") {
    this.geometry.push(point2);
  }
  else {
    var first = this.geometry[0];
    var last = this.geometry[this.geometry.length - 1];

    if (last == first)
      this.geometry.pop();

    this.geometry.push(point2);
    this.geometry.push(Object.assign({}, first));
  }
}