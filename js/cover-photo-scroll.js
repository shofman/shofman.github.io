"use strict";

var displayHelloWorld = function () {
    console.log("Hello World");
};

var locationRoller = {};
var languageRoller = {};

var languageMapping = {
    "PHP": "&lt;?php echo \"Hello World!\"; ?>",
    "Ruby": "puts \"Hello World\"",
    "Javascript": "<div class=\"top-level\">var displayHelloWorld = function () {<div>console.log(\"Hello World\");</div>};<div class=\"empty-space\"></div>displayHelloWorld();</div>",
    "Java": "<div class=\"top-level\">public class HelloWorld {<div class=\"empty-space\"></div> <div> public static void main(String[] args) { <div>System.out.println(\"Hello World\");</div>}</div><div class=\"empty-space\"></div>}</div>",
    "C#": "<div class=\"top-level\">using System;<div class=\"empty-space\"></div><div class=\"cancel-indent\">public class Hello <div class=\"cancel-indent\">{ <div>public static void Main() <div class=\"cancel-indent\">{<div>Console.WriteLine(\"Hello World!\");</div>}</div</div></div></div>}</div>",
    "SQL": "<div class=\"left-code\">SELECT G.Basic, P.Name <div>FROM Greetings as G, Places as P <div>WHERE G.Language = P.Location <div>ORDER BY P.Location;</div></div></div></div>",
    "Python": "print(\"Hello World!\")"
};

var locationMapping = {
    "North America": "northamerica",
    "South America": "southamerica",
    "Antarctica": "antarctica",
    "Africa": "africa",
    "Oceania": "oceania",
    "Asia": "asia",
    "Europe": "europe",
    "Caribbean": "caribbean"
};

var contactMapping = {
    "LinkedIn": '<a class="linkedin" href="https://www.linkedin.com/in/scott-hofman-92a36882/"><img src="./images/In-2C-108px-TM.png"/><p>View My LinkedIn<sub>™</sub> Page</p></a>',
    'GitHub': '<a href="https://github.com/shofman"><img src="./images/GitHub-Mark-120px-plus.png"/><p>View My GitHub Page</p></a>',
    'Skype': '<a class="keep-text" href="skype:scott.hofman?add"><img src="./images/s-logo.png"/><p>scott.hofman</p></a></div>',
    'Email': '<a class="keep-text" href="mailto:scott.a.hofman@gmail.com"><img src="./images/email-icon.png"/><p>scott.a.hofman@gmail.com</p></a>',
    'Phone': '<a class="keep-text" href="tel:+15874323532"><img src="./images/phone-icon.png"/><p>+1-587-432-3532</p></a>'
};

window.onload = function () {
    function calcOffsetTop(elt) {
        var rect = elt.getBoundingClientRect();
        var bodyScrollTop = document.body.scrollTop;
        if (bodyScrollTop === 0) {
            bodyScrollTop = document.documentElement.scrollTop;
        }
        return rect.top + bodyScrollTop;
    }

    var setupCoverPhotoTransition = function (element, shouldCancelDemo) {
        var coverPhotoPosition = calcOffsetTop(element);
        var coverPhotoHeight = element.offsetHeight;
        var requestAnimation = window.requestAnimationFrame;
        var lastScrollTop = getScrollTop();
        var ticking = false;

        var fadeImageOut = function(element, elementOffsetHeight, elementHeight) {
            var opacity = 1 - ((lastScrollTop - elementOffsetHeight + 100) / elementHeight);
            setCoverPhotoOpacity(element, opacity);
        };
        var setCoverPhotoOpacity = function (element, opacity) {
            element.style.opacity = opacity;
        };

        function getScrollTop() {
            var backupBodyElement = (document.documentElement || document.body.parentNode || document.body);
            var scrollTop = (window.pageYOffset !== undefined) ? window.pageYOffset : backupBodyElement.scrollTop;
            return scrollTop;
        }

        function isInViewport(element){
          if(element.offsetTop<window.innerHeight && 
               element.offsetTop>-element.offsetHeight
             && element.offsetLeft>-element.offsetWidth
             && element.offsetLeft<window.innerWidth){
              return true;
            } else {
              return false;
            }
        }

        window.addEventListener('scroll', function(e) {
          if (!ticking) {
            var scrollTop = getScrollTop();
            var viewportHeight = window.innerHeight;
            window.requestAnimationFrame(function() {
                if (scrollTop > coverPhotoPosition && !(scrollTop > coverPhotoPosition + coverPhotoHeight)) {
                    lastScrollTop = scrollTop;
                    fadeImageOut(element, coverPhotoPosition, coverPhotoHeight);
                    ticking = false;
                    return;
                } else if (scrollTop < coverPhotoPosition) {
                    setCoverPhotoOpacity(element, 1);
                    if (shouldCancelDemo && scrollTop + viewportHeight > coverPhotoPosition + 200) {
                        locationRoller.cancelDemo();
                    }
                    ticking = false;
                    return;
                } else if (scrollTop > coverPhotoPosition + coverPhotoHeight) {
                    setCoverPhotoOpacity(element, 0);
                    ticking = false;
                    return;
                }
            });
          }
          ticking = true;
        });

        function updatePhotoPosition() {
            coverPhotoHeight = element.offsetHeight;
            coverPhotoPosition = calcOffsetTop(element);
        }

        return {
            updatePhotoPosition: updatePhotoPosition
        }
    };

    var setupRoller = function (baseElement, demoRollerOptions, displayElement, displayMapping, callback) {
        var demoCount = 0;
        var heightAdjustmentTimeout;
        var opacityTimeout;
        var angle = 0;
        var elementSelected = 0;
        var shapeElement = baseElement.getElementsByClassName("shape")[0];
        var stageElement = baseElement.getElementsByClassName("stage")[0];
        var itemElements = baseElement.getElementsByClassName("item");
        var angleDelta = 360 / itemElements.length;
        var lastItemElementIndex = itemElements.length - 1;

        function changeRollerItem() {
            if (shapeElement) {
                shapeElement.style.transform = "rotateX(" + angle + "deg)";
            }
            if (displayElement) {
                displayElement.style.opacity = 0;
                opacityTimeout = setTimeout(function(){
                    var currentItem = itemElements[elementSelected];
                    if (currentItem) {
                        var countryInfo = getCountryInfo();

                        var countriesToShow = Object.keys(countryInfo).filter(countryName =>
                            countryInfo[countryName].fillKey === displayMapping[currentItem.getAttribute("data-item")] &&
                            countryInfo[countryName].visited
                        );

                        console.log('country', countriesToShow)

                        var listOutput = countriesToShow.sort().map(countryCode => 
                            '<li class="flag ' + countryInfo[countryCode].flagName + (countryInfo[countryCode].lived ? ' lived' : '') + '">' + countryInfo[countryCode].countryName + '</li>'
                        );

                        if (listOutput.length) {
                            displayElement.innerHTML = listOutput.join('');
                        } else {
                            displayElement.innerHTML = displayMapping[currentItem.getAttribute("data-item")];
                        }
                        if (callback) {
                            callback();
                            heightAdjustmentTimeout = setTimeout(function(){
                                displayElement.style.opacity = 1;
                                callForNewMap();
                            }, 500);
                        } else {
                            displayElement.style.opacity = 1;
                        }
                    }
                }, 300);
            }
        }

        var cancelDemo = function () {
            if (demoScroll) {
                clearInterval(demoScroll);
            }
        };

        var updateWheelAngle = function (event) {
            var change = event.deltaY > 0 ? 1 : -1;
            angle += change * angleDelta;
            updateElementSelected(-change);
        };

        var updateClickAngle = function (event) {
            var offsetTop = calcOffsetTop(shapeElement);
            var clickLocation = event.pageY - offsetTop;
            var change = clickLocation > 0 ? 1 : -1;
            if (change == 1 && 0 > clickLocation + 20) {
                return;
            }
            if (change == -1 && 0 < clickLocation - 20) {
                return;
            }
            angle += change * angleDelta;
            updateElementSelected(-change);
        };

        var updateElementSelected = function (changeValue) {
            elementSelected += changeValue;
            if (elementSelected < 0) {
                elementSelected = lastItemElementIndex;
            }
            if (elementSelected > lastItemElementIndex) {
                elementSelected = 0;
            }
        };

        var updateSpinner = function() {
            window.requestAnimationFrame(changeRollerItem);
            cancelDemo();
            if (heightAdjustmentTimeout) {
                clearTimeout(heightAdjustmentTimeout);
            }
            if (opacityTimeout) {
                clearTimeout(opacityTimeout);
            }
        };

        var demoScrollbar = function () {
            var fakeEvent = {deltaY: 10};
            updateWheelAngle(fakeEvent);
            window.requestAnimationFrame(changeRollerItem);

            demoCount++;
            if (demoCount > (itemElements.length * 2 - 1)) {
                cancelDemo();
            }
        };

        var setupRollerAppearance = function (elements) {
            var baseAngle = 0;
            var zTranslateValue = (elements.length - 2) * 20 + 10;
            if (elements.length <= 5) {
                zTranslateValue = 75;
            }
            for (var i=0; i<elements.length; i++) {
                // Order of operations matters here - rotate then translate
                elements[i].style.transform = "rotateX(" + baseAngle + "deg) translateZ(" + zTranslateValue + "px)";
                baseAngle += angleDelta;
            }
        };

        var getSelectedElement = function () {
            return itemElements[elementSelected].getAttribute("data-item");
        };

        if (stageElement) {
            stageElement.addEventListener("wheel", function(event) {
                updateWheelAngle(event);
                updateSpinner();
                event.preventDefault();
            });
        }

        if (shapeElement) {
            shapeElement.style.display = "block";
            shapeElement.addEventListener("click", function(event) {
                updateClickAngle(event);
                updateSpinner();
                event.preventDefault();
            });
        }

        var isIE = /MSIE \d|Trident.*rv:/.test(navigator.userAgent);
        window.requestAnimationFrame(function() {
            if(!isIE) {
                setupRollerAppearance(itemElements);
                changeRollerItem();
            }
        });

        if (demoRollerOptions.demo === true && !isIE) {
            var demoScroll = setInterval(demoScrollbar, demoRollerOptions.speed);
        }


        return {
            getSelectedElement: getSelectedElement,
            cancelDemo: cancelDemo
        };
    };

    var adjustHeightOfDisplayElement = function () {
        window.requestAnimationFrame(function() {
            locationWrapper.style.height = (displayLocations.offsetHeight + displayLocationsHeader.offsetHeight) + "px";
            calgaryPhoto.updatePhotoPosition();
        });
    };

    window.onresize = function () {
        adjustHeightOfDisplayElement();
    };


    setupCoverPhotoTransition(document.getElementsByClassName("cover-photo-image")[0], false);
    var calgaryPhoto = setupCoverPhotoTransition(document.getElementsByClassName("cover-photo-image")[1], true);

    var codeDisplay = document.getElementsByClassName("display-code")[0];
    var locationsDisplay = document.getElementsByClassName("country-list")[0];
    var contactDisplay = document.getElementsByClassName("display-contact-details")[0];

    console.log("displayHelloWorld is available - just in case you wanted to check...");
    var langaugeRollerElement = document.getElementById("languages");
    var locationRollerElement = document.getElementById("locations");
    var contactRollerElement = document.getElementById("contact");
    var locationWrapper = document.getElementsByClassName("location-display-wrapper")[0];
    var displayLocations = locationWrapper.getElementsByClassName("display-locations")[0];
    var displayLocationsHeader = locationWrapper.getElementsByClassName("header")[0];
    var languageRollerOptions = {demo: true, speed: 2200};
    var locationRollerOptions = {demo: true, speed: 3000};
    var contactRollerOptions = {demo: false};
    languageRoller = setupRoller(langaugeRollerElement, languageRollerOptions, codeDisplay, languageMapping);
    setupRoller(contactRollerElement, contactRollerOptions, contactDisplay, contactMapping);
    if (!locationRoller.getSelectedElement) {
        locationRoller = setupRoller(locationRollerElement, locationRollerOptions, locationsDisplay, locationMapping, adjustHeightOfDisplayElement);
    }
}
