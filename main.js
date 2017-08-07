$(document).ready(function () {
    function generateUniqueFourDigitRandomNumber() { 
      var numbers = [];
        while (numbers.length < 4) {
            var newNr = (parseInt(Math.random() * 9))+1;
            if (numbers.indexOf(newNr) == -1) {
                numbers.push(newNr);
            }
        }
        console.log("Glad you checked -> "+parseInt(numbers.join("")));
     return parseInt(numbers.join(""));
    }

function showStatus(text_bold, text_normal) {
    $("#status").html("<b>" + text_bold + "</b> " + text_normal);
  }    
  function game_victory() {
    showStatus("Victory!", "You finished the game.");
    $("#title_work").text("Victory!");
    $("#form_number_submit").hide();
    $(".history").hide();
    $(".instructions").hide(); 
    $(".victory").append('<img src="./resources/images/victory.gif">') 
      
  }    
    function verifyNumber(userInput, answer) { 
        if (userInput === answer) {
            addRecordToHistory(userInput, 4, 4);
            game_victory();
            console.log("You won")
        }
        else {
            var correctNumbers = 0;
            var correctPositions = 0;
            correctNumbers = countCorrectNumbers(userInput, answer);
            correctPositions = countCorrectPositions(userInput, answer);
            addRecordToHistory(userInput, correctNumbers, correctPositions);

         }
    }

    function countCorrectNumbers(userInput, answer) { 
        var correctNumberCounter = 0;
        var userInputString = userInput.toString();
        var answerString = answer.toString(); 
        for (var i = 0; i < 4; i++) { 
            if(userInputString.indexOf(answerString.charAt(i)) != -1){
                correctNumberCounter++;
            }
        }
        return correctNumberCounter;
    }

    function countCorrectPositions(userInput, answer) { 
        var correctPositionCounter = 0;
        var userInputString = userInput.toString();
        var answerString = answer.toString(); 
        for (var i = 0; i < 4; i++) { 
            if(userInputString.charAt(i) == answerString.charAt(i)){
                correctPositionCounter++;
            }
        }
        return correctPositionCounter;
        
    }
     $.fn.floatBalls = function(vertSpeed, horiSpeed, index) {
   
    this.css('float', 'left');

    vertSpeed = vertSpeed || 1;
    horiSpeed = 1/horiSpeed || 1;

    var windowH = this.parent().height(),
        thisH = this.height(),
        parentW = (this.parent().width() - this.width()) / 2,
        rand = Math.random() * (index * 1000),
        current = this;

    this.css('margin-top', windowH + thisH);
    this.parent().css('overflow', 'hidden');

    setInterval(function() {
        current.css({
            marginTop: function(n, v) {
                return parseFloat(v) - vertSpeed;
            },
            marginLeft: function(n, v) {
                return (Math.sin(new Date().getTime() / (horiSpeed * 1000) + rand) + 1) * parentW;
            }
        });
    }, 15);

    setInterval(function() {
        if (parseFloat(current.css('margin-top')) < -thisH) {
            current.css('margin-top', windowH + thisH);
        }
    }, 250);
};
    function hasDistinctDigits(number) {
     var numMask = 0;
     var numDigits = parseInt(Math.ceil(Math.log10(number+1)));
     for (var digitIdx = 0; digitIdx < numDigits; digitIdx++) {
         var curDigit = parseInt((number / Math.pow(10,digitIdx)) % 10);
         var digitMask = parseInt(Math.pow(2, curDigit));             
         if ((numMask & digitMask) > 0) {
             return false;
          } 
         numMask = numMask | digitMask;
     }
     return true;
    }

    function addRecordToHistory(userInput, correctNumbers, correctPositions) { 
        $(".history").show();
    var $div =$('.message');
    var $tr = $("<tr class='entry'>");
    $tbody =          $(`.entries`);
    //$tr.append($("<td>", {text: $("tr", $tbody).length + 1}));
    $tr.append($("<td>", { text: userInput }));
     
    $tr.append($("<td>", { text: correctNumbers }));
    
    $tr.append($("<td>", { text: correctPositions }));     
    $tbody.append($tr);
    //$div.append($tbody);    
   // $(".history").append($div);  
  var message = 1;
$('.message').each(function(message) {  
    $(this).floatBalls(.5, .5, message);
    message++
});
    }


    function startGame() { 
        var answer = generateUniqueFourDigitRandomNumber();
        var userInput = 0;
        $("#startGame").hide();
        $(".history").hide();
        $("#gameBoard").show();
        $("#status").show();

        $("#tryIt").on("click", function(evt){
        evt.preventDefault(); // prevent Submit
        userInput = parseInt($("#your_number").val());
        if (isNaN(userInput))
            showStatus("Error:", "Enter only numbers.");   
        else if (userInput.toString().length != 4) {
          showStatus("Error:", "Enter a 4 digit number.");    
        }    
        else {
            if (hasDistinctDigits(userInput)) {
                showStatus("Status:", "Try to find the good number.");
                verifyNumber(userInput, answer);
            }
            else { 
                showStatus("Error:", "Try numbers with 4 distinct digits, please.");
            }
            }
        });

    }
    $("#gameBoard").hide();
    $("#status").hide();
    $("#startGame").on("click", startGame);
 });