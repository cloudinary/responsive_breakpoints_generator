module.exports = function(grunt) {

  require('load-grunt-tasks')(grunt);

var PathConfig = require('./grunt-settings.js');

  // tasks
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    config: PathConfig,

    //clean files
    clean: {
      options: { force: true },
      temp: {
        src: ["<%= config.cssDir %>**/*.map", "<%= config.imgDir %>", "<%= config.cssMainFileDir %><%= config.cssMainFileName %>.css.map", "./jpgtmp.jpg"]
      }
    },

    // autoprefixer
    // autoprefixer: {
    //   options: {
    //     browsers: ['last 4 version', 'Android 4', 'ie 8', 'ie 9']
    //   },

    //   multiple_files: {
    //     options: {
    //         map: true
    //     },
    //     expand: true,
    //     flatten: true,
    //     src: ['<%= config.cssDir %>*.css', '<%= config.cssMainFileDir %><%= config.cssMainFileName %>.css']
    //   },

    //   dist: {
    //     src: ['<%= config.cssDir %>*.css', 
    //           '<%= config.cssMainFileDir %><%= config.cssMainFileName %>.css',
    //           '!<%= config.cssDir %>bootstrap.css',
    //           '!<%= config.cssDir %>bootstrap.min.css',
    //           '!<%= config.cssDir %>ie.css',
    //           '!<%= config.cssDir %>ie8.css'
    //           ]
    //   },
    // },

    postcss: {
      dev: {
        options: {
          map: true,
          processors: [
            require('autoprefixer-core')({browsers: ['last 4 version', 'Android 4']})
          ]
        },
        src: ['<%= config.cssDir %>*.css',
              '<%= config.cssMainFileDir %><%= config.cssMainFileName %>.css',
              '!<%= config.cssDir %>bootstrap.css',
              '!<%= config.cssDir %>bootstrap.min.css',
              '!<%= config.cssDir %>ie.css',
              '!<%= config.cssDir %>ie8.css'
              ]
      },
      dist: {
        options: {
          map: false,
          processors: [
            require('autoprefixer-core')({browsers: ['last 4 version', 'Android 4']})
          ]
        },
        src: ['<%= config.cssDir %>*.css',
              '<%= config.cssMainFileDir %><%= config.cssMainFileName %>.css',
              '!<%= config.cssDir %>bootstrap.css',
              '!<%= config.cssDir %>bootstrap.min.css',
              '!<%= config.cssDir %>ie.css',
              '!<%= config.cssDir %>ie8.css'
              ]
      }
    },

    //sass
    sass: {
      options: PathConfig.hasBower,
      dev: {
        options: {
          sourceMap: true,
          style: 'nested'
        },
        files: [
          {
            expand: true,
            cwd: '<%= config.sassDir %>',
            src: ['**/*.scss', '!<%= config.sassMainFileName %>.scss'],
            dest: '<%= config.cssDir %>',
            ext: '.css'
          },
          {src: '<%= config.sassDir %><%= config.sassMainFileName %>.scss', dest: '<%= config.cssMainFileDir %><%= config.cssMainFileName %>.css'}
        ]
      },
      dist: {
        options: {
          sourceMap: false,
          style: 'nested'
        },
        files: [
          {
            expand: true,
            cwd: '<%= config.sassDir %>',
            src: ['**/*.scss', '!<%= config.sassMainFileName %>.scss'],
            dest: '<%= config.cssDir %>',
            ext: '.css'
          },
          {src: '<%= config.sassDir %><%= config.sassMainFileName %>.scss', dest: '<%= config.cssMainFileDir %><%= config.cssMainFileName %>.css'}
        ]
      },
      min: {
        options: {
          sourceMap: false,
          outputStyle: 'compressed'
        },
        files: [
          {
            expand: true,
            cwd: '<%= config.sassDir %>',
            src: ['**/*.scss', '!<%= config.sassMainFileName %>.scss'],
            dest: '<%= config.cssDir %>',
            ext: '.min.css'
          },
          {src: '<%= config.sassDir %><%= config.sassMainFileName %>.scss', dest: '<%= config.cssMainFileDir %><%= config.cssMainFileName %>.min.css'}
        ]
      }
    },

    //watcher project
    watch: {
      options: {
        debounceDelay: 1,
        // livereload: true,
      },
      images: {
        files: ['<%= config.imgSourceDir %>**/*.*'],
        tasks: [/*'img:jpg', 'newer:pngmin:all', 'newer:svgmin'*/ 'newer:copy:images'],
        options: {
            spawn: false
        }
      },
      svgSprites: {
        files: ['<%= config.imgSourceDir %>svg-icons/*.*'],
        tasks: ['svgstore', 'svg2string'],
        options: {
            spawn: false
        }
      },
      css: {
        files: ['<%= config.sassDir %>**/*.scss'],
        tasks: ['sass:dev', 'postcss:dev'],
        options: {
            spawn: false,
        }
      }
    },

    copy: {
      images: {
        expand: true,
        cwd: '<%= config.imgSourceDir %>',
        src: '**',
        dest: '<%= config.imgDir %>',
        //flatten: true,
        filter: 'isFile',
      }
    },

    imagemin: {                          
      dynamic: {                         
        files: [{
          expand: true,                  
          cwd: '<%= config.imgSourceDir %>',                   
          src: ['**/*.{jpg,gif}'],   
          dest: '<%= config.imgDir %>'                  
        }]
      }
    },

    svgmin: {
      options: {
       plugins: [
         {
             removeViewBox: false
         }, {
             removeUselessStrokeAndFill: false
         }
       ]
      },
      dist: {
       files: [
          {
            expand: true,
            src: ['**/*.svg'],
            cwd: '<%= config.imgSourceDir %>',
            dest: '<%= config.imgDir %>'
          }
        ]
      }
    },

    svgstore: {
      options: {
        prefix : 'icon-', // This will prefix each ID
        svg: { // will add and overide the the default xmlns="http://www.w3.org/2000/svg" attribute to the resulting SVG
          viewBox : '0 0 100 100',
          xmlns: 'http://www.w3.org/2000/svg'
        },
        cleanup: ['fill']
      },
      your_target: {
        files: {
          '<%= config.imgDir %>svg-sprites/sprite.svg': ['<%= config.imgDir %>svg-icons/*.svg'],
        },
      },
    },

    svg2string: {
      elements: {
        options: {
          template: '(window.SVG_SPRITES = window.SVG_SPRITES || {})["[%= filename %]"] = [%= content %];',
          wrapLines: false
        },
        files: {
          '<%= config.jsDir %>svg-sprites.js': [
            // '<%= config.imgDir %>sprite.svg',
            '<%= config.imgDir %>svg-sprites/sprite.svg'
          ]
        }
      }
    },

    // lossy image optimizing (compress png images with pngquant)
    pngmin: {
      all: {
        options: {
          ext: '.png',
          force: true
        },
        files: [
          {
            expand: true,
            src: ['**/*.png'],
            cwd: '<%= config.imgSourceDir %>',
            dest: '<%= config.imgDir %>'
          }
        ]
      },
    },

    //Keep multiple browsers & devices in sync when building websites.
    browserSync: {
      dev: {
        bsFiles: {
          src : ['*.html','<%= config.cssDir %>*.css', '*.css']
        },
        options: {
          server: {
            baseDir: "../",
            index: "index.html",
            directory: true
          },
          watchTask: true
        }
      }
    },

    notify: {
      options: {
        enabled: true,
        max_js_hint_notifications: 5,
        title: "WP project"
      },
      watch: {
        options: {
          title: 'Task Complete',  // optional
          message: 'SASS finished running', //required
        }
      },
    }, 

    //copy files
    // copy: {
    //   dist: {
    //     files: [
    //       {
    //         expand: true,
    //         dot: true,
    //         cwd: './',
    //         src: [
    //           '**',

    //           '!scss/**',
    //           '!**/**/.svn/**',
    //           '!css/**',
    //         ],
    //         dest: '<%= config.distDir %>'
    //       } 
    //     ]
    //   },
    // },

    csscomb: {
      all: {
        expand: true,
        src: ['<%= config.cssDir %>*.css', 
              '<%= config.cssMainFileDir %><%= config.cssMainFileName %>.css',
              '!<%= config.cssDir %>bootstrap.css',
              '!<%= config.cssDir %>ie.css',
              '!<%= config.cssDir %>ie8.css'
              ],
        ext: '.css'
      },
      dist: {
        expand: true,
        files: {
          '<%= config.cssMainFileDir %><%= config.cssMainFileName %>.css' : '<%= config.cssMainFileDir %><%= config.cssMainFileName %>.css'
        },
      }
    },

    cmq: {
      options: {
        log: false
      },
      all: {
        files: [
          {
            expand: true,
            src: ['**/*.css', '!bootstrap.css'],
            cwd: '<%= config.cssDir %>',
            dest: '<%= config.cssDir %>'
          }
        ]
      },
      dist: {
        files: {
          '<%= config.cssMainFileDir %><%= config.cssMainFileName %>.css' : '<%= config.cssMainFileDir %><%= config.cssMainFileName %>.css'
        },
      }
    },

    'sftp-deploy': {
      build: {
        auth: {
          host: '<%= config.sftpServer %>',
          port: '<%= config.sftpPort %>',
          authKey: {
                    "username": "<%= config.sftpLogin %>",
                    "password": "<%= config.sftpPas %>"
                  }
        },
        cache: 'sftpCache.json',
        src: 'css',
        dest: '<%= config.sftpDestination %>',
        //exclusions: ['/path/to/source/folder/**/.DS_Store', '/path/to/source/folder/**/Thumbs.db', 'dist/tmp'],
        serverSep: '/',
        concurrency: 4,
        progress: true
      }
    }

  });

// run task
//dev 
  //watch
  grunt.registerTask('w', ['watch']);
  //browser sync
  grunt.registerTask('bs', ['browserSync']);

  //watch + browser sync
  grunt.registerTask('dev', ['browserSync', 'watch']);

  //create svg sprite
  grunt.registerTask('svgsprite', ['svgmin', 'svgstore', 'svg2string']);
  
  grunt.registerTask('default', ['dev']);

  // upload to server
  grunt.registerTask('sftp', ['sftp-deploy']);

//finally 
  //css beautiful
  grunt.registerTask('cssbeauty', ['sass:dist', 'cmq:dist', 'postcss:dist', 'csscomb:dist']);
  //img minify
  grunt.registerTask('imgmin', ['imagemin', 'pngmin:all', 'svgmin']);

  //final build
  grunt.registerTask('dist', ['clean:temp', 'imgmin', 'cssbeauty']);

};



