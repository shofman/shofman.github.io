"use strict";

const calcOffsetTop = (elt) => {
  const rect = elt.getBoundingClientRect();
  let bodyScrollTop = document.body.scrollTop;
  if (bodyScrollTop === 0) {
    bodyScrollTop = document.documentElement.scrollTop;
  }
  return rect.top + bodyScrollTop;
};

const getScrollTop = () => {
  const backupBodyElement = document.documentElement || document.body.parentNode || document.body;
  return backupBodyElement.scrollTop;
};

const setupCoverPhotoTransition = function (element, callbackFn) {
  let coverPhotoPosition = calcOffsetTop(element);
  let coverPhotoHeight = element.offsetHeight;
  let lastScrollTop = getScrollTop();
  let ticking = false;

  const fadeImageOut = function (element, elementOffsetHeight, elementHeight) {
    const opacity = 1 - (lastScrollTop - elementOffsetHeight + 100) / elementHeight;
    setCoverPhotoOpacity(element, opacity);
  };
  const setCoverPhotoOpacity = function (element, opacity) {
    element.style.opacity = opacity;
  };

  window.addEventListener("scroll", function (e) {
    if (!ticking) {
      const scrollTop = getScrollTop();
      const viewportHeight = window.innerHeight;
      window.requestAnimationFrame(function () {
        if (
          scrollTop > coverPhotoPosition &&
          !(scrollTop > coverPhotoPosition + coverPhotoHeight)
        ) {
          lastScrollTop = scrollTop;
          fadeImageOut(element, coverPhotoPosition, coverPhotoHeight);
          ticking = false;
          return;
        } else if (scrollTop < coverPhotoPosition) {
          setCoverPhotoOpacity(element, 1);
          if (callbackFn && scrollTop + viewportHeight > coverPhotoPosition + 200) {
            callbackFn();
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
    updatePhotoPosition: updatePhotoPosition,
  };
};

const setupRoller = function (
  baseElement,
  demoRollerOptions,
  displayElement,
  displayMapping,
  callback
) {
  let demoCount = 0;
  let heightAdjustmentTimeout;
  let opacityTimeout;
  let angle = 0;
  let elementSelected = 0;
  const shapeElement = baseElement.getElementsByClassName("shape")[0];
  const stageElement = baseElement.getElementsByClassName("stage")[0];
  const itemElements = baseElement.getElementsByClassName("item");
  const angleDelta = 360 / itemElements.length;
  const lastItemElementIndex = itemElements.length - 1;

  function changeRollerItem() {
    if (shapeElement) {
      shapeElement.style.transform = "rotateX(" + angle + "deg)";
    }
    if (displayElement) {
      displayElement.style.opacity = 0;
      opacityTimeout = setTimeout(function () {
        const currentItem = itemElements[elementSelected];
        if (currentItem) {
          const countryInfo = getCountryInfo();

          const countriesToShow = Object.keys(countryInfo).filter(
            (countryName) =>
              countryInfo[countryName].fillKey ===
                displayMapping[currentItem.getAttribute("data-item")] &&
              countryInfo[countryName].visited
          );

          const listOutput = countriesToShow
            .sort()
            .map(
              (countryCode) =>
                '<li class="flag ' +
                countryInfo[countryCode].flagName +
                (countryInfo[countryCode].lived ? " lived" : "") +
                '">' +
                countryInfo[countryCode].countryName +
                "</li>"
            );

          if (listOutput.length) {
            displayElement.innerHTML = listOutput.join("");
          } else {
            displayElement.innerHTML = displayMapping[currentItem.getAttribute("data-item")];
          }
          if (callback) {
            callback();
            heightAdjustmentTimeout = setTimeout(function () {
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

  const cancelDemo = function () {
    if (demoScroll) {
      clearInterval(demoScroll);
    }
  };

  const updateWheelAngle = function (event) {
    const change = event.deltaY > 0 ? 1 : -1;
    angle += change * angleDelta;
    updateElementSelected(-change);
  };

  const updateClickAngle = function (event) {
    const offsetTop = calcOffsetTop(shapeElement);
    const clickLocation = event.pageY - offsetTop;
    const change = clickLocation > 0 ? 1 : -1;
    if (change == 1 && 0 > clickLocation + 20) {
      return;
    }
    if (change == -1 && 0 < clickLocation - 20) {
      return;
    }
    angle += change * angleDelta;
    updateElementSelected(-change);
  };

  const updateElementSelected = function (changeValue) {
    elementSelected += changeValue;
    if (elementSelected < 0) {
      elementSelected = lastItemElementIndex;
    }
    if (elementSelected > lastItemElementIndex) {
      elementSelected = 0;
    }
  };

  const updateSpinner = function () {
    window.requestAnimationFrame(changeRollerItem);
    cancelDemo();
    if (heightAdjustmentTimeout) {
      clearTimeout(heightAdjustmentTimeout);
    }
    if (opacityTimeout) {
      clearTimeout(opacityTimeout);
    }
  };

  const demoScrollbar = function () {
    const fakeEvent = { deltaY: 10 };
    updateWheelAngle(fakeEvent);
    window.requestAnimationFrame(changeRollerItem);

    demoCount++;
    if (demoCount > itemElements.length * 2 - 1) {
      cancelDemo();
    }
  };

  const setupRollerAppearance = function (elements) {
    let baseAngle = 0;
    let zTranslateValue = (elements.length - 2) * 20 + 10;
    if (elements.length <= 5) {
      zTranslateValue = 75;
    }
    for (let i = 0; i < elements.length; i++) {
      // Order of operations matters here - rotate then translate
      elements[i].style.transform =
        "rotateX(" + baseAngle + "deg) translateZ(" + zTranslateValue + "px)";
      baseAngle += angleDelta;
    }
  };

  const getSelectedElement = function () {
    return itemElements[elementSelected].getAttribute("data-item").toLowerCase().replace(" ", "");
  };

  if (stageElement) {
    stageElement.addEventListener("wheel", function (event) {
      updateWheelAngle(event);
      updateSpinner();
      event.preventDefault();
    });
  }

  if (shapeElement) {
    shapeElement.style.display = "block";
    shapeElement.addEventListener("click", function (event) {
      updateClickAngle(event);
      updateSpinner();
      event.preventDefault();
    });
  }

  window.requestAnimationFrame(function () {
    setupRollerAppearance(itemElements);
    changeRollerItem();
  });

  if (demoRollerOptions.demo === true) {
    var demoScroll = setInterval(demoScrollbar, demoRollerOptions.speed);
  }

  return {
    getSelectedElement: getSelectedElement,
    cancelDemo: cancelDemo,
  };
};

const displayHelloWorld = () => {
  console.log("Hello World");
};

let locationRoller = {};
let languageRoller = {};

const languageMapping = {
  PHP: '&lt;?php echo "Hello World!"; ?>',
  Ruby: 'puts "Hello World"',
  Javascript:
    '<div class="top-level">const displayHelloWorld = function () {<div>console.log("Hello World");</div>};<div class="empty-space"></div>displayHelloWorld();</div>',
  Java: '<div class="top-level">public class HelloWorld {<div class="empty-space"></div> <div> public static void main(String[] args) { <div>System.out.println("Hello World");</div>}</div><div class="empty-space"></div>}</div>',
  "C#": '<div class="top-level">using System;<div class="empty-space"></div><div class="cancel-indent">public class Hello <div class="cancel-indent">{ <div>public static void Main() <div class="cancel-indent">{<div>Console.WriteLine("Hello World!");</div>}</div</div></div></div>}</div>',
  SQL: '<div class="left-code">SELECT G.Basic, P.Name <div>FROM Greetings as G, Places as P <div>WHERE G.Language = P.Location <div>ORDER BY P.Location;</div></div></div></div>',
  Python: 'print("Hello World!")',
};

const locationMapping = {
  "North America": "northamerica",
  "South America": "southamerica",
  Antarctica: "antarctica",
  Africa: "africa",
  Oceania: "oceania",
  Asia: "asia",
  Europe: "europe",
  Caribbean: "caribbean",
};

const contactMapping = {
  LinkedIn:
    '<a class="linkedin" href="https://www.linkedin.com/in/scott-hofman-92a36882/"><img src="./images/In-2C-108px-TM.png"/><p>View My LinkedIn<sub>™</sub> Page</p></a>',
  GitHub:
    '<a href="https://github.com/shofman"><img src="./images/GitHub-Mark-120px-plus.png"/><p>View My GitHub Page</p></a>',
  Email:
    '<a class="keep-text" href="mailto:scott.a.hofman@gmail.com"><img src="./images/email-icon.png"/><p>scott.a.hofman@gmail.com</p></a>',
};

const setupContactHover = () => {
  const contactElements = document.querySelectorAll("[data-item].contact-item");
  const displayContact = document.getElementsByClassName("display-contact-details")[0];
  for (let i = 0; i < contactElements.length; i++) {
    const elem = contactElements[i];
    const attribute = elem.getAttribute("data-item");

    const elemInteraction = () => {
      for (let j = 0; j < contactElements.length; j++) {
        contactElements[j].classList.remove("selected");
      }
      elem.classList.add("selected");
      displayContact.innerHTML = contactMapping[attribute];
    };

    elem.addEventListener("mouseover", elemInteraction);
    elem.addEventListener("onclick", elemInteraction);
  }
};

const mediaQuery = window.matchMedia(`(prefers-reduced-motion: reduce)`);
let isReducedMotion = mediaQuery === true || mediaQuery.matches === true
let showDemo = !isReducedMotion;

mediaQuery.addEventListener("change", (event) => {
  showDemo = false;
  isReducedMotion = event.matches
  if (languageRoller.cancelDemo) languageRoller.cancelDemo();
  if (locationRoller.cancelDemo) locationRoller.cancelDemo();
});

window.onload = function () {
  const locationWrapper = document.getElementsByClassName("location-display-wrapper")[0];
  const displayLocations = locationWrapper.getElementsByClassName("display-locations")[0];
  const displayLocationsHeader = locationWrapper.getElementsByClassName("header")[0];
  const adjustHeightOfDisplayElement = function () {
    window.requestAnimationFrame(function () {
      locationWrapper.style.height =
        displayLocations.offsetHeight + displayLocationsHeader.offsetHeight + "px";
      calgaryPhoto.updatePhotoPosition();
    });
  };

  window.onresize = function () {
    adjustHeightOfDisplayElement();
  };

  setupCoverPhotoTransition(document.getElementsByClassName("cover-photo-image")[0], false);
  const calgaryPhoto = setupCoverPhotoTransition(
    document.getElementsByClassName("cover-photo-image")[1],
    () => {
      locationRoller.cancelDemo();
    }
  );

  const codeDisplay = document.getElementsByClassName("display-code")[0];
  const locationsDisplay = document.getElementsByClassName("country-list")[0];

  console.log("displayHelloWorld is available - just in case you wanted to check...");
  const langaugeRollerElement = document.getElementById("languages");
  const locationRollerElement = document.getElementById("locations");

  // Language Roller
  languageRoller = setupRoller(
    langaugeRollerElement,
    { demo: showDemo, speed: 2200 },
    codeDisplay,
    languageMapping
  );

  // Setup contact
  setupContactHover();

  if (!locationRoller.getSelectedElement) {
    // Locations Visited
    locationRoller = setupRoller(
      locationRollerElement,
      { demo: showDemo, speed: 3000 },
      locationsDisplay,
      locationMapping,
      adjustHeightOfDisplayElement
    );
  }
};
