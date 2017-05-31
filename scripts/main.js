// Globals
var allShapes = [];
var mouseContext = {};
var selectedShape;
var createdShape;

// Add border width options
for (var i = 1; i < 10; i++) 
  $("#borderWidthDropdown").append($("<div></div>").attr("title", i).addClass("option").text(i + "px"));


// Canvas initialization
var canvas = $("#mainCanvas")[0];
var context = canvas.getContext("2d");

canvas.width  = $("#drawingPane").width();
canvas.height = $("#drawingPane").height();

// Event listeners
$(canvas).mousedown(onCanvasMouseDown).
mousemove(onCanvasMouseMove).
mouseup(onCanvasMouseUp).
dblclick(onCanvasDoubleClick);

$("#buttonsBlock").mousedown(function() { $("button").removeAttr("pressed"); createdShape = undefined; });
$("#toolsPanel .button").click(function() { $(this).attr("pressed", "true"); });
$(".dropDownButton").click(function() { $(this).attr("pressed", "true"); });

$("#scribble").click(function() { createShape("scribble"); });
$("#polyline").click(function() { createShape("polyline"); });
$("#rect").click(function()     { createShape("rect"); });
$("#ellipse").click(function()  { createShape("ellipse"); });
$("#polygon").click(function()  { createShape("polygon"); });

$("#clearAll").click(clearAll);
$("#deleteShape").click(deleteShape);

$("#screenshot").click(saveScreenshot);

$("#colorPickerFill").on("input", changeColor);
$("#colorPickerBorder").on("input", changeBorderColor);

var toggle = function() { $(this).next().toggle(300); };
var hide   = function() { $(this).next().hide(300); };

$("#borderStyle").click(toggle).focusout(hide);
$("#borderStyleDropdown .option").click(function() { changeBorderStyle($(this).attr("title")); });

$("#borderWidth").click(toggle).focusout(hide);
$("#borderWidthDropdown .option").click(function() { changeBorderWidth($(this).attr("title")); });

$(window).resize(function() {
  canvas.width  = $("#drawingPane").width();
  canvas.height = $("#drawingPane").height();
  
  reDraw(allShapes, context);
});

// Canvas event handlers
function onCanvasMouseDown(event) {
  var invalidate = false;
  var previousMouseDownPoint = mouseContext.mouseDownPoint;
  var currentPoint = {x: event.offsetX, y: event.offsetY};

  mouseContext.lastPoint = currentPoint;
  mouseContext.mouseDownPoint = currentPoint;

  // Unselect previous selection
  if (selectedShape && !selectedShape.hitTest(currentPoint)) {
    selectedShape.setSelected(false);
    selectedShape = undefined;
    invalidate = true;
  }

  // If not in creating mode, try to select a new shape
  if (!createdShape) {
    // Hit test
    var index = hitTest(currentPoint);

    selectedShape = index >= 0 ? allShapes[index] : undefined; 

    if (selectedShape) {
      selectedShape.setSelected(true);

      // Bring selected forward
      allShapes.splice(index, 1);
      allShapes.push(selectedShape);
      
      // Update controls
      $("#colorPickerFill").val(selectedShape.style.fillColor);
      $("#colorPickerBorder").val(selectedShape.style.borderColor);
      
      invalidate = true;
    }
    else {
      $("#colorPickerFill").val("#FFFFFF");
      $("#colorPickerBorder").val("#000000");
    }
  }
  else if (mouseContext.shapeCreation) { // We are in creation mode
    var shape;

    if (createdShape == "ellipse") {
      shape = new Ellipse("Ellipse" + allShapes.length, currentPoint, currentPoint);
    }
    else if (createdShape == "rect") {
      shape = new Rectangle("Rect" + allShapes.length, currentPoint, currentPoint);    
    }
    else if (createdShape == "scribble") {
      shape = new Scribble("Scribble" + allShapes.length, currentPoint, currentPoint);
    }
    else if (createdShape == "polyline") {
      shape = new Polyline("Polyline" + allShapes.length, currentPoint, currentPoint);
    }
    else if (createdShape == "polygon") {
      shape = new Polygon("Polygon" + allShapes.length, currentPoint, currentPoint);
    }

    allShapes.push(shape);
  }
  else if (createdShape) { // We are in first edit mode
    var editedShape = allShapes[allShapes.length - 1];
    editedShape.updateGeometry(previousMouseDownPoint, mouseContext.mouseDownPoint, "creatingMouseDown");
    invalidate = true;
  }

  // Redraw
  if (invalidate) 
    reDraw(allShapes, context);
  }


function onCanvasMouseMove(event) {
  var invalidate = false;
  var point = {x: event.offsetX, y: event.offsetY};

  // First editing of created shape
  if (createdShape && mouseContext.mouseDownPoint) {

    var editedShape = allShapes[allShapes.length - 1];
    editedShape.updateGeometry(mouseContext.mouseDownPoint, point, "creatingMouseMove");

    invalidate = true;

  }
  else if (selectedShape && mouseContext.lastPoint) { // Move or resize
    var dx = event.offsetX - mouseContext.lastPoint.x;
    var dy = event.offsetY - mouseContext.lastPoint.y;

    selectedShape.updateByDelta(dx, dy);
    mouseContext.lastPoint = point;

    invalidate = true;
  }

  // Redraw
  if (invalidate)
    reDraw(allShapes, context);
}


function onCanvasMouseUp(event) {
  if (createdShape) { // Creation finished for non-polygons
    if (createdShape == "polyline" || createdShape == "polygon") {
      mouseContext.shapeCreation = false;
      return;
    }

    $("button").removeAttr("pressed");
    createdShape = undefined;
  }

  mouseContext = {};
}


function onCanvasDoubleClick(event) {
  if (createdShape) { // Finish creation if needed
    
    var lastShape = allShapes[allShapes.length - 1];
    lastShape.updateGeometry(mouseContext.mouseDownPoint,
                             {x : event.offsetX, y : event.offsetY },
                             "creatingMouseDoubleClick");

    createdShape = undefined;
    mouseContext = {};

    reDraw(allShapes, context);
    
    $("button").removeAttr("pressed");
  }
}

function createShape(shape) { 
  createdShape = shape; 
  mouseContext.shapeCreation = true;
}

function hitTest(point) {
  var result = -1;

  // Iterate over all shapes and hittest them backwards
  for(i = (allShapes.length - 1); i >= 0; i--) {
    if (allShapes[i].hitTest(point)) {
     result = i;
     break;
    }
  }

  return result;
}

function reDraw(arr, context) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  arr.forEach(function(shape, i) { shape.draw(context); });
}

// Button  functions
function clearAll() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  allShapes.length = 0;
}

function deleteShape() {
  if (!selectedShape)
    return;

  allShapes.splice(allShapes.length - 1, 1);
  reDraw(allShapes, context);
}

function changeBorderStyle(borderStyle) {
  if (!selectedShape)
    return;

  selectedShape.style.borderStyle = borderStyle;

  reDraw(allShapes, context);
}

function changeBorderWidth(BoderWidth) {
  if (!selectedShape)
    return;

  selectedShape.style.borderWidth = parseInt(BoderWidth);

  reDraw(allShapes, context);
}

function changeColor() {
  if (!selectedShape)
    return;

  if (selectedShape.isClosedGeometry()) {
    selectedShape.style.fillColor = $("#colorPickerFill").val();

    reDraw(allShapes, context);
  }
}

function changeBorderColor() {
  if (!selectedShape)
    return;

  selectedShape.style.borderColor = $("#colorPickerBorder").val();

  reDraw(allShapes, context);
}

function saveScreenshot() {
  var image = canvas.toDataURL("image/png");

  var dlLink = document.createElement('a');
  dlLink.download = 'easypaint.png';
  dlLink.href = image;
  document.body.appendChild(dlLink);
  dlLink.click();
  document.body.removeChild(dlLink);
}