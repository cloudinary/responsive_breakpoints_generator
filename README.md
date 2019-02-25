# Responsive Image Breakpoints Generator

## Overview

Responsive web design requires developers to determine the image dimensions that best fit their website. This breakpoints generator tool helps developers automatically find the optimal image sizes needed for the best viewing experience in web and mobile apps on a variety of screen sizes.

The Responsive Breakpoints Generator enables you to interactively upload your images and define settings to find matching image dimensions that fit in your graphic design requirements. You can define the required image width range, the file size step in kilobytes and a safety limit of the maximum number of images you allow. In addition, you can request that the results include double resolution images for DPR 2.0 displays (e.g., Retina Display).

The breakpoints generator tool uses [Cloudinary's advanced algorithms](https://cloudinary.com) to easily generate best matching breakpoints for each uploaded image. 

## Live public tool

This project is available as a new free public web tool called the **[Responsive Image Breakpoints Generator](https://www.responsivebreakpoints.com/)**.

![Responsive Breakpoints](https://res.cloudinary.com/responsivebreakpoints/image/upload/w_200/responsive_breakpoints_logo_square.png)

**[https://www.responsivebreakpoints.com/](https://www.responsivebreakpoints.com/)**


## Project's content

This project is a lightweight web application that consists of the following modules and technologies:

 * Standard HTML5 and Javascript code.
 * [Cloudinary's Upload Widget](https://cloudinary.com/documentation/upload_widget) that uploads images directly from the browser to the cloud.
 * [Handlebars](https://handlebarsjs.com/) dynamic HTML template.
 * Simple Sinatra web application (written in Ruby). This application is the server-side component, which takes care of building signatures for authenticating API requests to [Cloudinary](https://cloudinary.com).


## Quick start
In order to start the server use the following command:

```console
> CLOUDINARY_URL=<YOUR_CLOUDINARY_URL> bundle exec puma -t 5:5 -p ${PORT:-3000} -e ${RACK_ENV:-development}
```

## License

Released under the MIT license. 

