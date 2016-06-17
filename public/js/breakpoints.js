function breakpointsController() {
  var lastImageInfo = null;
  var debug = window.location.search.indexOf('debug=true')>-1;

  var log = function() {
    if (debug===true && console && console.log){
      console.log.apply(console,arguments);
    }
  };

  var formToMap = function(selector) {
    var formData = $(selector).serializeArray();
    var data = {};
    $(formData).each(function(index, item){
        if (item.name.match(/\[\]/)) {
          data[item.name] = data[item.name] || [];
          data[item.name].push(item.value);
        } else {
          data[item.name] = item.value;  
        }
        
    });
    return data;
  };


  var initHandlebars = function() {
    function shortFileName(value) {
      var match = value.match(/\/image\/upload\/(.*)\/v\d+\/(.*)\.(.*)$/);
      if (match) {
        value = match[2] + "_" + match[1] + "." + match[3];
        return value.replace(/:/g, '_').replace(/[\/]/g, '__');
      }
      return value;
    }

    Handlebars.registerHelper('bytesToSize', function(value) {
      return bytesToSize(value);
    });
    Handlebars.registerHelper('increment', function(value) {
      return value + 1;
    });
    Handlebars.registerHelper('last', function(ar, options) {
      if (options.hash && options.hash.key) {
        return ar[ar.length-1][options.key];
      } else {
        return ar[ar.length-1];
      }
    });
    Handlebars.registerHelper('first', function(ar, options) {
      var value = null;
      if (options.hash && options.hash.key) {
        value = ar[0][options.hash.key];      
      } else {
        value = ar[0];
      }
      if (options.hash.helper && options.hash.helper == 'shortFileName') {
        return shortFileName(value);
      } else {
        return value;
      }

    });
    Handlebars.registerHelper('shortFileName', function(value) {
      return shortFileName(value);
    });

    Handlebars.registerHelper('noTextClass', function(breakpoints) {
      var i;
      for (i = 0; i < breakpoints.length; i++) {
        if (breakpoints[i].width == this.width) {
          break;
        }
      }
      var nextHeightPercents = (i == breakpoints.length-1) ? 0 : breakpoints[i+1].height_percents;
      if (breakpoints[i].height_percents - nextHeightPercents < 4) {
        return "no-text";        
      } else if (breakpoints[i].height_percents - nextHeightPercents < 8) {
        return "small-text";
      }
      return "";      
    });

    var sampleResolutions = [480, 768, 992, 1200, 1920];
    Handlebars.registerHelper('samplePictureWidth', function(value) {
      return sampleResolutions[value];
    });
    
  };

  var bytesToSize = function(bytes) {
    bytes = Number(bytes);
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return 'n/a';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    if (i === 0) return bytes + ' ' + sizes[i];
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
  };

  var sendAnalyticsEvent = function(eventLabel) {
    if (window.ga)  {
      ga('send', 'event', 'Engagement', 'click', eventLabel);
    }
  };

  var selected_screen_sizes = [];

  var prepareResponsiveCallAuthentication = function(imageInfo, callback) {
    $('#breakpoints-controls-form #public_id').val(imageInfo.public_id);
    var paramsMap = formToMap('#breakpoints-controls-form');
    selected_screen_sizes = [];
    log("paramsMap", paramsMap);
    if (paramsMap["aspect_ratios[]"]) {
      $.each(paramsMap["aspect_ratios[]"], function(index, aspect_ratio) {
        var screenSize = paramsMap["screen_sizes[]"][index];
        var screenSizeNumbers = screenSizePairToNumbers(screenSize);        
        selected_screen_sizes[index] = {
          aspect_ratio: aspect_ratio,
          screen_size: screenSize,
          screen_min_width: screenSizeNumbers[0],
          screen_max_width: screenSizeNumbers[1],
          screen_size_description: screenSizeNumbersToDescription(screenSizeNumbers[0], screenSizeNumbers[1]).toLowerCase(),
          view_port_ratio: paramsMap["view_port_ratios[]"][index],
          dpr: paramsMap["retina"] == '1' ? 2 : 1
        }
      });
    }    

    $.ajax({
      url: '/authenticate',
      type: 'POST',
      dataType: 'json',
      data: $('#breakpoints-controls-form').serialize(),
      success: function(authenticationInfo) {
        log("authenticationInfo", authenticationInfo);
        callback(authenticationInfo);
      },
      error: function(jqXHR, textStatus) { 
        log("Error requesting authentication", jqXHR);
        callback(null);
      }    
    });
  };

  var requestBreakpoints = function(authenticationInfo, callback) {
    $.ajax({
      url: authenticationInfo.url,
      type: 'POST',
      dataType: 'json',
      data: authenticationInfo.params,
      success: function(breakpointsInfo) {
        log("breakpointsInfo", breakpointsInfo);
        callback(breakpointsInfo);
      },
      error: function(jqXHR, textStatus) {
        log("Error requesting breakpoints", jqXHR);
        callback(null);
      }    
    });
  };

  var prepareZIPDownloadURL = function(breakpointsInfo, callback) {
    var widths = $.map(breakpointsInfo.responsive_breakpoints[0].breakpoints, function(breakpointInfo) {
      return breakpointInfo.width;
    }).join(",");
    $.ajax({
      url: '/zip_url',
      type: 'POST',
      dataType: 'json',
      data: { public_id: breakpointsInfo.public_id, breakpoints: JSON.stringify(breakpointsInfo.responsive_breakpoints) },

      success: function(zipInfo) {
        log("zipInfo", zipInfo);
        callback(zipInfo);
      },
      error: function(jqXHR, textStatus) {
      }    
    });  
  };

  var processBreakpoints = function(imageInfo, breakpointsInfo){
    
    $.each(breakpointsInfo.responsive_breakpoints, function(index, item) {
      var screen_size_info = selected_screen_sizes[index];
      if (screen_size_info) {
        $.extend(item, selected_screen_sizes[index]);  
      } else {
        item.aspect_ratio = "original";
        item.view_port_ratio = 100;        
      }      

      item.reversed_breakpoints = item.breakpoints.slice(0).reverse();
      item.max_image_logical_width = item.breakpoints[0].width;
      item.max_view_port_width = Math.round(item.max_image_logical_width / (item.view_port_ratio / 100.0));    

      $.map(item.reversed_breakpoints, function(breakpoint) {
        breakpoint.width_percents = (breakpoint.width / item.breakpoints[0].width) * 100;
        breakpoint.height_percents = (breakpoint.height / item.breakpoints[0].height) * 100;
      });
    });

    var model = {    
      info: breakpointsInfo,
      imageFormat: breakpointsInfo.format.toUpperCase(),
      imageSize: bytesToSize(breakpointsInfo.bytes),
      breakpointsResults: breakpointsInfo.responsive_breakpoints,
      reversedBreakpointsResults: breakpointsInfo.responsive_breakpoints.slice(0).reverse(),
    };
    log("model", model);

    $('#results-holder').html(Handlebars.compile($("#results-template").html())(model));
    if (breakpointsInfo.responsive_breakpoints.length > 1) {
      $('#picture-sample-holder').html(Handlebars.compile($("#picture-sample-template").html())(model));  
    } else {
      $('#picture-sample-holder').text('');
    }
    
    
    prepareZIPDownloadURL(breakpointsInfo, function(zipInfo) {
      $('#download-link').attr("href", zipInfo.url).removeClass('pending');
    });
    $("html, body").animate({ scrollTop: $('#results-holder').offset().top }, 1000);
  };

  var processImage = function(imageInfo) {    
    log("imageInfo", imageInfo); 
    $('.breakpoint-setting').removeClass('processed').addClass('processing');
    prepareResponsiveCallAuthentication(imageInfo, 
      function(authenticationInfo) {
        if (authenticationInfo) {
          requestBreakpoints(authenticationInfo, function(breakpointsInfo) {
            if (breakpointsInfo) {
              processBreakpoints(imageInfo, breakpointsInfo);
              lastImageInfo = imageInfo;            
            }
            $('.breakpoint-setting').removeClass('processing').addClass('processed');
          })          
        } else {
          $('.breakpoint-setting').removeClass('processing').addClass('processed');
        }
      });
  };

  var screenSizeNumbersToDescription = function(minWidth, maxWidth) {
    if (minWidth && maxWidth) {
      return "Width: " + minWidth + "-" + maxWidth;
    } else if (minWidth) {
      return "Width >= " + minWidth;
    } else if (maxWidth) {
      return "Width < " + maxWidth;
    } else {
      return "Any width";
    }              
  };

  var screenSizePairToNumbers = function(pairString) {
    var numbers = pairString.split(",");
    if (numbers[0] === "") {
      numbers[0] = null;
    }
    if (numbers[1] === "") {
      numbers[1] = null;
    }
    return numbers;
  };

  var updateScreenSizes = function() {
      var max_defined = false;
      $('#breakpoints-controls-form .screen-sizes').each(function() {
        $this = $(this);        
        var note = "-";
        var value = ","
        if ($this.is(':checked')) {
          var next_checked  = $($this.closest("li").nextAll("li").find('.screen-sizes:checked')[0]);

          var min_width;              
          var max_width;
          if (next_checked.length > 0) {
            min_width = next_checked.data('max-width')+1;                                    
          }
          if (max_defined) {
            max_width = $this.data('max-width');  
          }
          
          max_defined = true;
          note = screenSizeNumbersToDescription(min_width, max_width);
          value = (min_width || "") + "," + (max_width || "");
        }
        $this.closest('.check-box').find('.resolution-note').html(note);
        $this.val(value);
      });    
  };

  var initEventListners = function() {
    // NOTE: If you clone the open source project, you should update 'cloud_name' 
    // and 'upload_preset' to match your account settings.
    var uploadWidget = cloudinary.createUploadWidget({ 
      cloud_name: 'responsivebreakpoints', 
      upload_preset: 'ttuqmsbd', 
      theme: 'white', 
      multiple: false,
      sources: ['local', 'url'],
      resource_type: 'image'
    }, function(error, result) { 
      if (!error) {
        processImage(result[0]);      
        sendAnalyticsEvent("ImageUploaded");        
      }
    });
          
    $('#upload-widget-opener').click(function(e) { 
      e.preventDefault();
      if ($('.breakpoint-setting').hasClass('processing')) {
        log("Processing in progress");
        return;
      }
      uploadWidget.open();
      sendAnalyticsEvent("WidgetOpened");
    });

    $('.img-list input[type=radio]').click(function(e) {
      if ($('.breakpoint-setting').hasClass('processing')) {
        log("Processing in progress");
        return;
      }

      $("html, body").animate({ scrollTop: $('.breakpoint-setting').offset().top }, 300);
      processImage($(this).data('image-info'));    
      sendAnalyticsEvent("ImageSelected");
    });

    $('#regenerate-button').click(function(e) {
      e.preventDefault();
      if (lastImageInfo) {
        $("html, body").animate({ scrollTop: $('.breakpoint-setting').offset().top }, 300);
        processImage(lastImageInfo);    
        sendAnalyticsEvent("Regenerated");
      }
    });

    $('.expand').click(function(e) {
      e.preventDefault();
      $(this).hide();
      $(document).find($(this).attr('href')).show();
      sendAnalyticsEvent("IntroExpanded");
    });

    $('.ratio-list input[type=checkbox]').change(function(e) {
      var select = $(this).closest('li').find('select');
      select.prop('disabled', !select.prop('disabled'));
      jcf.getInstance(select[0]).refresh();
      jcf.getInstance(select[1]).refresh();
      updateScreenSizes();
    });

    $(window).resize(function(e) {
      if (document.location.hash == '#live-picture-sample' && $('.picture-sample-section').length > 0) {
        $('html, body').animate({scrollTop: $('.picture-sample-section h3').position().top}, 10);  
      }
      
    });

    if (window.location.search.indexOf('screen_size=all') != -1) {            
      $('.ratio-list input[type=checkbox]').prop('checked', true);
      $('.ratio-list li select').prop('disabled', false);
      jcf.refreshAll();
      updateScreenSizes();
    }
  };

  var init = function() {
    initHandlebars();  
    initEventListners();
  }

  
  init();
}


breakpointsController();