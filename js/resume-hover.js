"use strict";


window.onload = function () {
    var tooltip = document.getElementById('tooltip');

    var languages = document.getElementsByClassName("languages")[0];
    var listItems = languages.querySelectorAll('li');

    var mapping = {
        'javascript': 'This is the best thing that you ever have seen',
        'php': 'Followed by this'
    };

    var columnLeftPosition = 0;
    var currentColumnCount = 0;

    for (var i=0; i<listItems.length; i++) {
        // Order of operations matters here - rotate then translate
        var currentItem = listItems[i];
        var currentRect = currentItem.getBoundingClientRect();
        var currentPosition = Math.floor((currentRect.left + currentRect.right) / 2);
        if (i==0) {
            columnLeftPosition = currentPosition;
        } else {
            if (currentPosition !== columnLeftPosition) {
                columnLeftPosition = currentPosition;
                currentColumnCount++;
            }
        }
        currentItem.setAttribute('data-column', currentColumnCount);
       
        currentItem.addEventListener('mouseenter', function() {
            var rect = this.getBoundingClientRect();
            var bodyElt = document.body;
            var actualTop = rect.top + bodyElt.scrollTop;
            tooltip.classList.add("active");
            var display = tooltip.getElementsByClassName("tooltip-text")[0];
            display.innerHTML = mapping[this.getAttribute('data-item').toLowerCase()];
            if (this.getAttribute('data-column') === '0') {
                tooltip.style.right = "calc(100%-25%)";
                tooltip.style.left = "auto";
            } else {
                tooltip.style.right = "calc(100%-25%)";
                tooltip.style.left = (rect.right + 20) + "px";
            }
            tooltip.style.top = actualTop + "px";
        });

        currentItem.addEventListener('mouseleave', function() {
            tooltip.classList.remove('active');
        });
    }
}
