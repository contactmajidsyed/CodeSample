/**
 * Project Cengage Clue DevMath
 * File InteractiveVideo.js
 *
 * @version 1.0.0.0
 * @author Majid Syed<abdulmajid.syed@cengage.com>
 * @description
 *
 *Updated 12/2015 to use html5 video direct without using JWPlayer.
 */

var ClueSpinner = require('spin.js');
var ClueSpinnerOpts = require('./../../../ClueFramework/framework/modules/SpinnerConfig');
var InteractiveVideoConstants = require('./InteractiveVideoConstants');
var LinkedList = require('./LinkedTimeStamp');
var TimestampItem = require('./TimestampItem');
var TimestampTopic = require('./TimestampTopic');

InteractiveVideo.prototype = new Object();
InteractiveVideo.prototype.constructor = InteractiveVideo;


/**
 * Constructor
 * @constructor
 */
function InteractiveVideo(videoId, id, dataHandler, callbackInteract) {
    this.callbackInteract = callbackInteract;
    this._videoContainerId = videoId;
    this._jsonObject = dataHandler;
    //	To test the captions display
    //	this._jsonObject.main.videoViewModel.transcriptUrl = 'http://localhost:8080/cengage-devmath/authoringTool/EasyHTML5/100ACaptions.vtt';
    this._interactiveVideoChaptersDiv = InteractiveVideoConstants.INTERACTIVE_VIDEO_CHAPTERS_DIV + '_' + id;
    this._interactiveVideoTranscriptSpan = InteractiveVideoConstants.INTERACTIVE_VIDEO_TRANSCRIPT_SPAN + '_' + id;
    this._interactiveVideoChapterId = InteractiveVideoConstants.INTERACTIVE_VIDEO_CHAPTER_ID + id + '_';

    this._name = null;
    this._topics = [];
    this._listeners = {};
    this._captions = [];
    this._captionsText = '';
    this._currentCaption = 0;

    this._linkedList = new LinkedList();
    this.ended = false;
    this._debug = false;
    this._isPhone = (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    this.domService = Box.Application.getService('DomService');
    Box.Application.broadcast('GamePhoneBarModule-loadDivVideo');

    this.configureClonedDOM();
    this.onBeforePlayVideo();
    this.loadCaption(this._jsonObject.main.videoViewModel.captionsUrl);
    this._vidPlayer = this.createVideoPlayer(videoId + '_player');
    jQuery(".interactivevideo").children(this, videoId).append(this._vidPlayer);
    this.displayTranscriptButton(videoId);
    this.processData();
}

InteractiveVideo.prototype.displayTranscriptButton = function(videoId) {
  var transcriptUrl = this._jsonObject.main.videoViewModel.transcriptUrl;
  if(transcriptUrl && transcriptUrl != '') {
    jQuery('.interactivevideo-content').append('<div class="col-xs-12 col-sm-12 col-md-12 col-lg-12"><button class="btn btn-default transcript-button" aria-label="Transcript Hidden, click button to show">Show Transcript</button></div>');
    jQuery('.interactivevideo-content').append('<div class="col-xs-12 col-sm-12 col-md-12 col-lg-12 transcriptContainer" tabindex="0"><p id="transcriptText"></p></div>');
    jQuery('#transcriptText').hide();
    this.loadTranscriptText(transcriptUrl);

    jQuery( '.transcript-button' ).bind( 'click', function() {
      if(jQuery('#transcriptText').is(':visible')) {
          jQuery('#transcriptText').hide();
          jQuery('#transcriptContainer').blur();
          jQuery('.transcript-button').html('Show Transcript');
      }
      else {
        jQuery('#transcriptText').show();
        jQuery('.transcript-button').html('Hide Transcript');
        jQuery('.transcript-button').attr('aria-label','Transcript is now visible, click again to hide');
        // Scroll to a certain element
        document.querySelector('#transcriptText').scrollIntoView({
          behavior: 'smooth'
        });
      }
    });
  }
};

InteractiveVideo.prototype.on = function (name, fn) {
    var listeners = this._listeners[name];
    if (listeners == null) {
        listeners = [];
        this._listeners[name] = listeners;
    }
    listeners.push(fn);
};

InteractiveVideo.prototype._triggerListener = function (name) {
    (this._listeners[name] || []).forEach(function (fn) {
        fn();
    });
};


InteractiveVideo.prototype.applyFeedback = function (jsonObject) {
    this._linkedList.head.updateRender(jsonObject.main.questions);
};


InteractiveVideo.prototype.updateParameters = function (newJson) {
    this._jsonObject = newJson;
};


/**
 * Changes the DOM id of the cloned elements of the DOM to avoid use multiple times the same id.
 */
InteractiveVideo.prototype.configureClonedDOM = function () {
    jQuery(InteractiveVideoConstants.INTERACTIVE_VIDEO_CHAPTERS_DIV).attr({id: this._interactiveVideoChaptersDiv.substr(1)});
    jQuery(InteractiveVideoConstants.INTERACTIVE_VIDEO_TRANSCRIPT_SPAN).attr({id: this._interactiveVideoTranscriptSpan.substr(1)});
};

/**
 * Get the caption file from server and create the transcript objects.
 * @param captionUrl: caption file url.
 */
InteractiveVideo.prototype.loadCaption = function (captionUrl) {
    this._captionsText = '';
    var r = new XMLHttpRequest();
    r.onreadystatechange = function () {
        if (r.readyState == 4 && r.status == 200) {
            var t = r.responseText.split("\n");
            while (t.length > 0) {
                if (t[0].indexOf(' --> ') > -1) {
                    var caption =
                        {
                            begin: this.stringToSeconds(t[0].split(' --> ')[0]),
                            end: this.stringToSeconds(t[0].split(' --> ')[1]),
                            text: ''
                        };
                    t.shift();
                    if (t.length > 0) {
                      caption.text = t[0];
                    }
                    this._captionsText += caption.text + "\n";
                    this._captions.push(caption);
                }
                t.shift();
            }
        }
    }.bind(this);
    r.open('GET', captionUrl, true);
    r.send();
};

/**
 * Convert to number a string with the format 00:00.000 or 00:00:00.000
 * @param s: the string to convert to seconds.
 */
InteractiveVideo.prototype.stringToSeconds = function (s) {
    var a = s.split(':');
    var r = Number(a[a.length - 1]) + Number(a[a.length - 2]) * 60;
    if (a.length > 2) {
        r += Number(a[a.length - 3]) * 3600;
    }
    return r;
};

InteractiveVideo.prototype.loadTranscriptText = function(transcriptUrl) {
  jQuery.ajax({
    url : transcriptUrl,
    dataType: "text",
    success : function (data) {
      jQuery("#transcriptText").html(data);
    }
  });
};

/**
 * Shows the transcripts of the video at the given time.
 */
InteractiveVideo.prototype.showCaption = function (time) {
    if (this._currentCaption > 0 && this._captions[this._currentCaption].begin > time) {
        this._currentCaption = 0;
    }
    var transcriptSend = false;
    for (var i = this._currentCaption, l = this._captions.length; i < l; i++) {
        if (i == this._currentCaption) this.log('Starting caption ' + i);
        if (this._captions[i].begin < time && time < this._captions[i].end) {
            transcriptSend = true;
            jQuery(InteractiveVideoConstants.INTERACTIVE_VIDEO_CLOSED_CAPTIONS).html(this._captions[i].text);
            this._currentCaption = i;
            break;
        }
    }
    if (!transcriptSend) jQuery(InteractiveVideoConstants.INTERACTIVE_VIDEO_CLOSED_CAPTIONS).text('');
};

InteractiveVideo.prototype.error = function (event) {
    console.log(this._vidPlayer.error);
    alert("Error on media : " + this._vidPlayer.error.code);
}

InteractiveVideo.prototype.ended = function (event) {
    this.callbackInteract("SUMMARY", '{}');
}

/**
 *  Creates the videoplayer to be appended
 */
InteractiveVideo.prototype.createVideoPlayer = function (playerId) {
    var vidUrl = this._jsonObject.main.videoViewModel.videos[0].url;
    var vidType = '';
    if (vidUrl.lastIndexOf('.') > 0) vidType = 'video/' + vidUrl.substr(vidUrl.lastIndexOf('.') + 1);
    if (vidUrl.toLowerCase().lastIndexOf('.m4v') > 0) vidType = 'video/mp4';
    var src = document.createElement('source');
    src.setAttribute('src', vidUrl);
    if (vidType != '') src.setAttribute('type', vidType);

    var player = document.createElement('video');
    player.setAttribute('id', playerId);
    player.setAttribute('width', 640);
    player.setAttribute('height', 480);
    player.setAttribute('controls', true);
    player.setAttribute('tabindex', 0);

    //uncomment the following setting to see the html5 subtitle track is added.
    //	player.setAttribute('crossorigin', 'anonymous');
    if (this._jsonObject.main.videoViewModel.posterUrl != undefined && this._jsonObject.main.videoViewModel.posterUrl != '')
        player.setAttribute('poster', this._jsonObject.main.videoViewModel.posterUrl);
    player.setAttribute('style', 'font-size:8px; line-height:0.8;');
    player.ontimeupdate = this.timeUpdateEventListener.bind(this);

    var prevDate = 0;

    var actIdNullCallBack = function () {
        prevDate = Date.now();
        this._triggerListener("secondEnd");
    }.bind(this);

    player.onended = function () {
        this.log('Ended at ' + this._vidPlayer.currentTime);
        var self = this;
        if (this.ended == false) {
            this.ended = true;
            var mediaQuizSummaryEvent = function () {
                if (self.isFinished()) {
                    self.pauseVideo();
                    prevDate = Date.now();
                    self.callbackInteract("MEDIA_QUIZ_SUMMARY_EVENT", '{}', null, actIdNullCallBack);
                } else {
                    setTimeout(mediaQuizSummaryEvent, 1000);
                }
            };
            mediaQuizSummaryEvent();
        } else if (Date.now() - prevDate > 5000) { // prevent duplicate execution
            actIdNullCallBack();
        }

    }.bind(this);


    player.onerror = this.error.bind(this);
    player.oncanplay = this.onPlayerReady.bind(this);
    player.appendChild(src);
    return player;
}

InteractiveVideo.prototype.isFinished = function () {
    var tsi = this._linkedList.head;
    var complete = true;
    while (tsi) {
        complete &= tsi.isFinished();
        tsi = tsi.next;
    }
    return complete;
};

/**
 * Sets up the JWPlayer.
 */
InteractiveVideo.prototype.setJwplayer = function () {
    var videoURL = this._jsonObject.main.videoViewModel.videos[0].url;
    if (videoURL == '') {
        videoURL = 'https://s3-us-west-2.amazonaws.com/cengageclue/TestImages/Placeholder+CLsmall.mp4';
    } else {
        // hack
        videoURL = videoURL.replace('httpss', 'https');
    }

    this._vidPlayer.setup({
        file: videoURL,
        image: this._jsonObject.main.videoViewModel.posterUrl,
        width: 660,
        height: 480,
        primary: 'html5',
        events: {
            onBeforePlay: this.onBeforePlayVideo(),
            onTime: this.timeUpdateEventListener.bind(this),
            onReady: this.onJWPlayerReady.bind(this),
            onComplete: function () {
                this.callbackInteract("MEDIA_QUIZ_SUMMARY_EVENT", '{}');
            }.bind(this)
        },
        skin: contextPath + "/resources/Others/InteractiveVideos/skin/devMathVideo.xml",
        tracks: [{
            file: this._jsonObject.main.videoViewModel.transcriptUrl,
            label: "English",
            kind: "captions",
            "default": true
        }]
    });
};

InteractiveVideo.prototype.onBeforePlayVideo = function()
{
	this.domService = Box.Application.getService('DomService');
	var target = this.domService.findBySelector('#interactivevideo-left');
	this.spinner = new ClueSpinner(ClueSpinnerOpts);
	this.spinner.spin (target[0]);
};


InteractiveVideo.prototype.onPlayerReady = function () {
    this.domService = Box.Application.getService('DomService');
    this.spinner.stop();
};

InteractiveVideo.prototype.showTranscriptModal = function () {
    Box.Application.broadcast('modal-showAlert', {message: '<pre>' + this._captionsText + '</pre>'});
    this.pauseVideo();
};

/**
 * returns the video player.
 */
InteractiveVideo.prototype.player = function () {
    return this._vidPlayer;
};

/**
 * Pauses the interactive video.
 */
InteractiveVideo.prototype.pauseVideo = function () {
    this._vidPlayer.pause();
};

/**
 * plays the interactive video.
 */
InteractiveVideo.prototype.playVideo = function () {
    this._vidPlayer.play();
};

/**
 * plays the interactive video if not finished.
 */
InteractiveVideo.prototype.playVideoIfNotFinished = function () {
    !this._vidPlayer.ended && this._vidPlayer.play();
};


/**
 * Hides or show the transcript.
 */
InteractiveVideo.prototype.toggleTranscript = function () {
    jQuery(this._interactiveVideoTranscriptSpan).toggle();
};

/**
 * Event listener for the "time update" of the video.
 * @param event the time update event.
 */
InteractiveVideo.prototype.timeUpdateEventListener = function (event) {
    if (!event.position) event.position = this._vidPlayer.currentTime;
    this.log(this._vidPlayer.currentTime);

    var time = Math.floor(event.position);

    var isEnd = event.position >= this._vidPlayer.duration;
    if (isEnd) {
        time = time + 1;
    }

    var differenceBetweenPrevAndCurrentEvent = Math.abs(time - (this._prevTimestemp | 0 || -1));
    if (!this._vidPlayer.paused && differenceBetweenPrevAndCurrentEvent < 1) {
        return; //prevent double execution, we need one time per second
    }
    this._prevTimestemp = time;

    this._linkedList.head.update(time);
    this.showCaption(time);

    if (isEnd) {
        this.log('forcing to complete');
        this._vidPlayer.onended();
    }
};

/**
 * Process the JSON object and create all the classes used by the Interactive Video.
 */
InteractiveVideo.prototype.processData = function () {
    this._name = this._jsonObject.main.title;
    var skippable = this._jsonObject.main.skippable;

    for (var i = 0; i < this._jsonObject.main.questions.length; i++) {
        var newTimeStampItem = new TimestampItem(this._jsonObject.main.questions[i], this, skippable);
        if (i == 0)//create the linked list
        {
            this._linkedList.push(newTimeStampItem);
        }
        else//insertion sorted
        {
            pushSorted(this._linkedList, newTimeStampItem);
        }
    }

    for (var i = 0; i < this._jsonObject.main.topics.length; i++) {
        this._topics.push(new TimestampTopic(this._jsonObject.main.topics[i].timestamp, this._jsonObject.main.topics[i].endTime, this._jsonObject.main.topics[i].name, this));
    }

    this._topics.sort(this.arrangeChapters);
    this.createChapterList();
};

InteractiveVideo.prototype.seek = function (time) {
    this._vidPlayer.currentTime = time;
    this.pauseVideo();
};


/**
 * Arrange the chapter by time.
 * @param a The first chapter.
 * @param b The second chapter.
 * @returns {Number} 1 if a > b, 0 if a == b, -1 if a < b.
 */
InteractiveVideo.prototype.arrangeChapters = function (a, b) {
    if (a.getTime() < b.getTime()) return -1;
    if (a.getTime() > b.getTime()) return 1;
    return 0;
};


InteractiveVideo.prototype.findClueQuestionByTime = function (time) {
    var clueQuestion = this._linkedList.filter(function (timestampItem) {
        return timestampItem._time == time;
    })[0];

    if (!clueQuestion) {
        clueQuestion = this._linkedList.filter(function (timestampItem) {
            return Math.abs(timestampItem._time - time) <= 1;
        })[0]
    }
    return clueQuestion;
};

/**
 * Creates the navigable chapter list at the default html element set at _interactiveVideoChaptersDiv.
 */
InteractiveVideo.prototype.createChapterList = function () {
    var interactiveChaptersTitle = $('<h1 class="interactivevideo-chapters-title">' + this._name.trim() + '</h1>');
    $('.interactive-video-tittle').append(interactiveChaptersTitle);

    var interactiveChaptersList = $('<ul class="interactivevideo-chapters-list">');

    for (var i = 0; i < this._topics.length; i++) {
        var chapterTitle = this._topics[i].getName();
        var interactiveChapterListElement = $('<li class="interactive-video-chapter-link" disabled="true" >');
        var chapterButton = $('<button class="interactive_video_chapter_button" tabindex="0">' + chapterTitle + '</button>');
        chapterButton.attr({id: this._interactiveVideoChapterId + i});
        chapterButton.attr("aria-label", chapterTitle);
        interactiveChapterListElement.append(chapterButton);
        interactiveChaptersList.append(interactiveChapterListElement);
    }

    $(this._interactiveVideoChaptersDiv).empty();
    $(this._interactiveVideoChaptersDiv).append(interactiveChaptersList);

    this.domService.clickEvent('button[id^="' + this._interactiveVideoChapterId + '"]', _goToChapter.bind(this));
};

/**
 * Change the chapters class.
 **/
InteractiveVideo.prototype.updateChaptersState = function (time) {
    $(this._interactiveVideoChaptersDiv).find('li.interactive-video-chapter-link').removeClass("interactive-video-chapter-current-link");

    var self = this;
    var end = false;
    this._topics.forEach(function (topic, chapterIndex) {

        var $chapter = $('#' + self._interactiveVideoChapterId + chapterIndex).parent();

        if (!end) {
            $chapter.attr('disabled', false);
        }

        var startTime = topic._time;
        var endTime = topic._endTime;

        if (self._topics.length - 1 == chapterIndex) {
            endTime += 1;
        }

        if (startTime <= time && time <= endTime) {
            $chapter.addClass('interactive-video-chapter-current-link');
            end = true;
        }

    });

};

/**
 * write the message to console if the debug is enabled from external.
 * @param message String message to be written to console.
 */
InteractiveVideo.prototype.enableDebug = function (enabled) {
    this._debug = enabled ? true : false;
};

/**
 * write the message to console if the debug is enabled from external.
 * @param message String message to be written to console.
 */
InteractiveVideo.prototype.log = function (msg) {
    if (this._debug) console.log(msg);
};

function _goToChapter(event) {
    this._prevTimestemp = null;
    if (!this._vidPlayer.paused)
        this.pauseVideo();

    var chapterIndex = parseInt(event.currentTarget.id.replace(new RegExp('^' + this._interactiveVideoChapterId, 'g'), ""));
    var chapter = this._topics[chapterIndex];

    var clueQuestion = this.findClueQuestionByTime(chapter.getTime());

    if (clueQuestion) {
        this._linkedList.head.select(clueQuestion._time);
        this._vidPlayer.currentTime = clueQuestion._time;
    } else {
        this._vidPlayer.currentTime = chapter.getTime();
        if (!this._isPhone) {
            this.playVideo();
        }
    }
}

/**
 * Push in a sorted way objects into the linked list
 * @param {Object} timeStampItem  A timeStamp object
 */
function pushSorted(sll, timeStampItem){
  var head = sll.head,
    current = head,
    previous;

  //lower that the head
  if(timeStampItem._time < sll.head._time){
    sll.head = timeStampItem;
    timeStampItem.next = head;
    return sll;
  }

  while(current){
    if(current._time > timeStampItem._time){
      previous = timeStampItem;
      timeStampItem.next = current;
      return sll;
    }
    previous = current;
    current = current.next;
  }

  //higher than the last node value
  previous.next = timeStampItem;
  timeStampItem.next = null;
  return sll;
};

module.exports = InteractiveVideo;
