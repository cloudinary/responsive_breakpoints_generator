function breakpointsController() {
  var lastImageInfo = null;
  var debug = window.location.search.indexOf('debug=true')>-1;

  var log = function() {
    if (debug===true && console && console.log){
      console.log.apply(console,arguments);
    }
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
    Handlebars.registerHelper('aspectRatio', function(value) {
      if (!value || value == '') {
        return "original";
      }
      return value.match(/ar_(\d+:\d+)/)[1];
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

  var prepareResponsiveCallAuthentication = function(imageInfo, callback) {
    var params = {};
    var retina = 0;
    var aspect_ratios = [];
    log("Serialized form", $('#breakpoints-controls-form').serializeArray());
    $.each($('#breakpoints-controls-form').serializeArray(), function(index, pair) {
      if (pair.name == 'aspect_ratio') {
        if (pair.value != '') {
          aspect_ratios.push(pair.value);  
        }      
      } else if (pair.name == 'retina') {
        retina = pair.value;
      } else {
        params[pair.name] = pair.value;  
      }    
    });

    if (params.bytes_step) {
      params.bytes_step = parseInt(params.bytes_step)*1024;
    }

    $.ajax({
      url: '/authenticate',
      type: 'POST',
      dataType: 'json',
      data: { public_id: imageInfo.public_id, aspect_ratios: aspect_ratios.join(","), retina: retina, breakpoints_settings: params },
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
      item.reversed_breakpoints = item.breakpoints.slice(0).reverse();
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

    var source = $("#results-template").html();
    var template = Handlebars.compile(source);

    var html = template(model);
    $('#results-holder').html(html);

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
      processImage(result[0]);      
      sendAnalyticsEvent("ImageUploaded");
    });
          
    $('#upload-widget-opener').click(function(e) { 
      e.preventDefault();
      uploadWidget.open();
      sendAnalyticsEvent("WidgetOpened");
    });

    $('.img-list input[type=radio]').click(function(e) {
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
  };

  var init = function() {
    initHandlebars();  
    initEventListners();
  }

  
  init();
}


breakpointsController();