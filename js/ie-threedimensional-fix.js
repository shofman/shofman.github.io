
document.addEventListener("DOMContentLoaded", function (event) {
  let ieLanguages = document.getElementById("languages");
  let ieCountries = document.getElementById("locations");
  let codeDisplay = document.getElementsByClassName("display-code")[0];
  let countryDisplay = document.getElementsByClassName("country-list")[0];
  let locationWrapper = document.getElementsByClassName("location-display-wrapper")[0];
  let displayLocations = locationWrapper.getElementsByClassName("display-locations")[0];

  ieLanguages.innerHTML = '<div class="stationary-frame">\
    <div class="moving-frame"> \
      <div class="spinner-items" style="margin-top: -100px;">SQL</div> \
      <div class="spinner-items" style="margin-top: 0px;">Ruby</div> \
      <div class="spinner-items selected">Javascript</div> \
      <div class="spinner-items">PHP</div> \
      <div class="spinner-items">C#</div> \
      <div class="spinner-items">Python</div> \
      <div class="spinner-items">Java</div> \
    </div> \
  </div>';

  ieCountries.innerHTML = '<div class="stationary-frame">\
    <div class="moving-frame country"> \
      <div class="spinner-items" style="margin-top: -100px;">South America</div> \
      <div class="spinner-items" style="margin-top: 0px;">Antarctica</div> \
      <div class="spinner-items selected">North America</div> \
      <div class="spinner-items">Europe</div> \
      <div class="spinner-items">Africa</div> \
      <div class="spinner-items">Oceania</div> \
      <div class="spinner-items">Asia</div> \
    </div> \
  </div>';

  let ieSpinner = function(grouping, display, displayMapping, callback) {
    let itemsInList = grouping.getElementsByClassName('spinner-items');
    var transition = false;
    let heightAdjustmentTimeout;
    let clickTransition = function(event) {
      let currentFocus = getCurrentlySelectedCode(grouping);
      let firstValue = [].slice.call(itemsInList).indexOf(this);
      let secondValue = [].slice.call(itemsInList).indexOf(currentFocus);
      let firstElement = [].slice.call(itemsInList)[0];

      if (firstValue < secondValue) {
        // Move up - we clicked the language above
        let oldHtml = [].slice.call(itemsInList)[itemsInList.length-1].innerHTML;
        [].slice.call(itemsInList)[itemsInList.length-1].outerHTML='';
        var newFirstElement = document.createElement('div');
        newFirstElement.classList.add("spinner-items");
        newFirstElement.innerHTML = oldHtml;
        newFirstElement.style["margin-top"] = "-100px";
        newFirstElement.addEventListener('click', clickTransition);
        firstElement.parentElement.insertBefore(newFirstElement, firstElement);
        this.classList.add("selected");
        currentFocus.classList.remove("selected");
        

        heightAdjustmentTimeout = setTimeout(function(){
          transition = false;
          timerDone = true;
          clearTimeout(heightAdjustmentTimeout);
          firstElement.style["margin-top"] = "0";
        }, 500);

      } else if (firstValue > secondValue) {
        if (!transition) {
          transition = true;
          // Move down  - we clicked the language below
          [].slice.call(itemsInList)[1].style["margin-top"] = "-100px";
          this.classList.add("selected");
          currentFocus.classList.remove("selected");
          let heightAdjustmentTimeout = setTimeout(function(){
            if (transition) {
              let oldHtml = [].slice.call(itemsInList)[0].innerHTML;
              var newLastElement = document.createElement('div');
              newLastElement.classList.add("spinner-items");
              newLastElement.addEventListener('click', clickTransition);
              newLastElement.innerHTML = oldHtml;
              firstElement.parentElement.appendChild(newLastElement);
              [].slice.call(itemsInList)[0].outerHTML='';
              transition = false;
            }
          }, 500);
        }
      }

      let currentHtml = this.innerHTML;

      display.style.opacity = 0;
      opacityTimeout = setTimeout(function(){
        display.innerHTML = displayMapping[currentHtml];
        if (callback) {
          callback();
          heightAdjustmentTimeout = setTimeout(function(){
              display.style.opacity = 1;
              callForNewMap();
          }, 500);
        } else {
          display.style.opacity = 1;
        }
      }, 500);
    };
    for(i=0; i<itemsInList.length; i++) {
      itemsInList[i].addEventListener('click', clickTransition);
    }

    function getCurrentlySelectedCode(grouping) {
      return grouping.getElementsByClassName('selected')[0];
    }

    function getSelectedElement() {
      return getCurrentlySelectedCode(grouping).innerHTML;
    }

    return {
      getSelectedElement: getSelectedElement
    }
  };

  function adjustLocationHeight () {
    locationWrapper.style.height = (displayLocations.offsetHeight + 20) + "px";
  }
  
  ieSpinner(ieLanguages, codeDisplay, languageMapping);
  locationRoller = ieSpinner(ieCountries, countryDisplay, locationMapping, adjustLocationHeight);
});
