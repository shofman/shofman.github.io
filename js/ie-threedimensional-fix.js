"use strict";

document.addEventListener("DOMContentLoaded", function (event) {
  var ieLanguages = document.getElementById("languages");
  var ieCountries = document.getElementById("locations");
  var ieContact = document.getElementById("contact");
  var codeDisplay = document.getElementsByClassName("display-code")[0];
  var countryDisplay = document.getElementsByClassName("country-list")[0];
  var contactDisplay = document.getElementsByClassName("display-contact-details")[0];
  var locationWrapper = document.getElementsByClassName("location-display-wrapper")[0];
  var displayLocations = locationWrapper.getElementsByClassName("display-locations")[0];

  ieLanguages.innerHTML = '<div class="stationary-frame">\
    <div class="moving-frame"> \
      <div data-item="SQL" class="spinner-items" style="margin-top: -100px;">SQL</div> \
      <div data-item="Ruby" class="spinner-items" style="margin-top: 0px;">Ruby</div> \
      <div data-item="Javascript" class="spinner-items selected">Javascript</div> \
      <div data-item="PHP" class="spinner-items">PHP</div> \
      <div data-item="C#" class="spinner-items">C#</div> \
      <div data-item="Python" class="spinner-items">Python</div> \
      <div data-item="Java" class="spinner-items">Java</div> \
    </div> \
  </div>';

  ieCountries.innerHTML = '<div class="stationary-frame">\
    <div class="moving-frame country"> \
      <div data-item="South America" class="spinner-items" style="margin-top: -100px;">South America</div> \
      <div data-item="Antarctica" class="spinner-items" style="margin-top: 0px;">Antarctica</div> \
      <div data-item="North America" class="spinner-items selected">North America</div> \
      <div data-item="Europe" class="spinner-items">Europe</div> \
      <div data-item="Africa" class="spinner-items">Africa</div> \
      <div data-item="Oceania" class="spinner-items">Oceania</div> \
      <div data-item="Asia" class="spinner-items">Asia</div> \
    </div> \
  </div>';

  ieContact.innerHTML = '<div class="stationary-frame">\
    <div class="moving-frame country"> \
      <div data-item="LinkedIn" class="spinner-items" style="margin-top: -100px;">LinkedIn<sub class="trademark">™</sub></div> \
      <div data-item="GitHub" class="spinner-items" style="margin-top: 0px;">GitHub</div> \
      <div data-item="Email" class="spinner-items selected">Email</div> \
      <div data-item="Phone" class="spinner-items">Phone</div> \
      <div data-item="Skype" class="spinner-items">Skype<sub class="trademark">™</sub></div> \
    </div> \
  </div>';

  var ieSpinner = function(grouping, display, displayMapping, callback) {
    var itemsInList = grouping.getElementsByClassName('spinner-items');
    var transition = false;
    var heightAdjustmentTimeout;
    var clickTransition = function(event) {
      var currentFocus = getCurrentlySelectedCode(grouping);
      var firstValue = [].slice.call(itemsInList).indexOf(this);
      var secondValue = [].slice.call(itemsInList).indexOf(currentFocus);
      var firstElement = [].slice.call(itemsInList)[0];

      if (firstValue < secondValue) {
        // Move up - we clicked the language above
        var oldItem = [].slice.call(itemsInList)[itemsInList.length-1];
        var oldHtml = oldItem.innerHTML;
        var oldDataItem = oldItem.getAttribute("data-item");
        [].slice.call(itemsInList)[itemsInList.length-1].outerHTML='';
        var newFirstElement = document.createElement('div');
        newFirstElement.classList.add("spinner-items");
        newFirstElement.innerHTML = oldHtml;
        newFirstElement.setAttribute("data-item", oldDataItem);
        newFirstElement.style["margin-top"] = "-100px";
        newFirstElement.addEventListener('click', clickTransition);
        firstElement.parentElement.insertBefore(newFirstElement, firstElement);
        this.classList.add("selected");
        currentFocus.classList.remove("selected");
        

        heightAdjustmentTimeout = setTimeout(function(){
          transition = false;
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
          var heightAdjustmentTimeout = setTimeout(function(){
            if (transition) {
              var oldItem = [].slice.call(itemsInList)[0];
              var oldHtml = oldItem.innerHTML;
              var oldDataItem = oldItem.getAttribute("data-item");
              var newLastElement = document.createElement('div');
              newLastElement.classList.add("spinner-items");
              newLastElement.addEventListener('click', clickTransition);
              newLastElement.innerHTML = oldHtml;
              newLastElement.setAttribute("data-item", oldDataItem);
              firstElement.parentElement.appendChild(newLastElement);
              [].slice.call(itemsInList)[0].outerHTML='';
              transition = false;
            }
          }, 500);
        }
      }
      var selectedItem = this.getAttribute("data-item");

      display.style.opacity = 0;
      var opacityTimeout = setTimeout(function(){
        display.innerHTML = displayMapping[selectedItem];
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
    for(var i=0; i<itemsInList.length; i++) {
      itemsInList[i].addEventListener('click', clickTransition);
    }

    function getCurrentlySelectedCode(grouping) {
      return grouping.getElementsByClassName('selected')[0];
    }

    function getSelectedElement() {
      return getCurrentlySelectedCode(grouping).getAttribute("data-item");
    }

    display.innerHTML = displayMapping[getSelectedElement()];

    return {
      getSelectedElement: getSelectedElement
    }
  };

  function adjustLocationHeight () {
    locationWrapper.style.height = (displayLocations.offsetHeight + 20) + "px";
  }
  
  ieSpinner(ieLanguages, codeDisplay, languageMapping);
  locationRoller = ieSpinner(ieCountries, countryDisplay, locationMapping, adjustLocationHeight);
  ieSpinner(ieContact, contactDisplay, contactMapping);
});
