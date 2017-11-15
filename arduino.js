
var five = require("johnny-five");
var myBoard, myLed;

myBoard = new five.Board();

myBoard.on("ready", function() {

  myLed = new five.Led(8);

  myLed.on(1000);
  setTimeout(function(){
  	myLed.off(1000);
  }, 3000)
  
});
