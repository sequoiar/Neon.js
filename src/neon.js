/*
Copyright (C) 2011 by Gregory Burlet, Alastair Porter

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// this pattern was taken from http://www.virgentech.com/blog/2009/10/building-object-oriented-jquery-plugin.html
(function($) {
    var Neon = function(element, options)
    {
        var elem = $(element);
        var mei;
        var rendEng;
        var startTime;

        // These are variables which can be overridden upon instantiation
        var defaults = {
            width: 800,
            height: 600,
            autoLoad: false,
            debug: false,
            filename: "",
            backgroundImage: "",
            backgroundImageOpacity: 0.60
        };

        var settings = $.extend({}, defaults, options);

        // These are variables which can not be overridden by the user
        var globals = {
            canvasid: "neon-canvas"
        };

        $.extend(settings, globals);

        /******************************
         *      PUBLIC FUNCTIONS      *
         ******************************/
        // placeholder

        /******************************
         *      PRIVATE FUNCTIONS     *
         ******************************/
        var init = function() {
            // start time
            startTime = new Date();

            // initialize rendering engine
            rendEng = new Toe.View.RenderEngine();

            /*
             * Start asynchronous function calls
             * Get promises and wait for queued functions to finish
             * 1) load neume glyphs from svg file
             * 2) load MEI file from server
             * 3) load background image and get canvas dimensions from it
             * on success (all done): continue processing
             * on failure, print error message
             */
            $.when(loadGlyphs(rendEng),
                   loadPage(settings.filename),
                   handleBackgroundImage(settings.backgroundImage)
            ).then(loadSuccess,
                   function() {
                       console.log("Failure to load the mei file, glyphs, or background image");
                   }
            );
        };

        // helper function
        var parseBoundingBox = function(zoneFacs) {
            var ulx = parseInt($(zoneFacs).attr("ulx"));
            var uly = parseInt($(zoneFacs).attr("uly"));
            var lrx = parseInt($(zoneFacs).attr("lrx"));
            var lry = parseInt($(zoneFacs).attr("lry"));

            return [ulx, uly, lrx, lry];
        };

        var loadMeiPage = function(displayZones, page) {
            var clefList = $("clef, sb", mei);
            // calculate sb indices in the clef list
            var clef_sbInd = new Array();
            $(clefList).each(function(cit, cel) {
                if ($(cel).is("sb")) {
                    clef_sbInd.push(cit);
                }
            });

            var neumeList = $("neume, sb", mei);
            // calculate sb indices in the neume list
            // precomputing will render better performance than a filter operation in the loops
            var neume_sbInd = new Array();
            $(neumeList).each(function(nit, nel)  {
                if ($(nel).is("sb")) {
                    neume_sbInd.push(nit);
                }
            });

            var divList = $("division, sb", mei);
            // calculate sb indices in the division list
            var div_sbInd = new Array();
            $(divList).each(function(dit, del) {
                if ($(del).is("sb")) {
                    div_sbInd.push(dit);
                }
            });

            var custosList = $("custos, sb", mei);
            // calculate sb indices in the custos list
            var custos_sbInd = new Array();
            $(custosList).each(function(cit, cel) {
                if ($(cel).is("sb")) {
                    custos_sbInd.push(cit);
                }
            });
    
            // for each system
            $("sb", mei).each(function(sit, sel) {
                console.log("system " + (sit+1));
                // get facs data
                var sbref = $(sel).attr("systemref");
                var sysfacsid = $($(mei).find("system[xml\\:id=" + sbref + "]")[0]).attr("facs");
                var sysFacs = $(mei).find("zone[xml\\:id=" + sysfacsid + "]")[0];

                // create staff
                var s_bb = parseBoundingBox(sysFacs);
                if (displayZones) {
                    rendEng.outlineBoundingBox(s_bb, {fill: "blue"});
                }

                // get id of parent layer
                var sModel = new Toe.Model.Staff(s_bb);
                sModel.setID($(sel).attr("xml:id"));

                // set global scale using staff from first system
                if(sit == 0) {
                    rendEng.calcScaleFromStaff(sModel, {overwrite: true});
                }

                // instantiate staff view and controller
                var sView = new Toe.View.StaffView(rendEng);
                var sCtrl = new Toe.Ctrl.StaffController(sModel, sView);
                page.addStaff(sModel);

                // load all clefs in the system
                $(clefList).slice(clef_sbInd[sit]+1, clef_sbInd[sit+1]).each(function(cit, cel) {
                    var clefShape = $(cel).attr("shape");
                    var clefStaffLine = parseInt($(cel).attr("line"));

                    // convert mei line attribute to staffPos attribute used in the internal clef Model
                    var staffPos = -(sModel.props.numLines - clefStaffLine) * 2;

                    var clefFacsId = $(cel).attr("facs");
                    var clefFacs = $(mei).find("zone[xml\\:id=" + clefFacsId + "]")[0];
                    var c_bb = parseBoundingBox(clefFacs);
                    if (displayZones) {
                        rendEng.outlineBoundingBox(c_bb, {fill: "red"});
                    }

                    var cModel = new Toe.Model.Clef(clefShape, {"staffPos": staffPos});
                    cModel.setID($(cel).attr("xml:id"));
                    cModel.setBoundingBox(c_bb);

                    // instantiate clef view and controller
                    var cView = new Toe.View.ClefView(rendEng);
                    var cCtrl = new Toe.Ctrl.ClefController(cModel, cView);

                    // mount clef on the staff
                    sModel.addClef(cModel);

                    console.log("clef: " + cModel.name);
                });

                // load all neumes in the system
                $(neumeList).slice(neume_sbInd[sit]+1, neume_sbInd[sit+1]).each(function(nit, nel) {
                    var nModel = new Toe.Model.Neume();
                    var neumeFacs = $(mei).find("zone[xml\\:id=" + $(nel).attr("facs") + "]")[0];
                    var n_bb = parseBoundingBox(neumeFacs);
                    if (displayZones) {
                        rendEng.outlineBoundingBox(n_bb, {fill: "green"});
                    }

                    nModel.neumeFromMei(nel, $(neumeFacs), sModel);
                    // instantiate neume view and controller
                    var nView = new Toe.View.NeumeView(rendEng);
                    var nCtrl = new Toe.Ctrl.NeumeController(nModel, nView);

                    // mount neume on the staff
                    sModel.addNeume(nModel);

                    console.log("neume: " + nModel.props.type.name);
                });

                // load all divisions in the system
                $(divList).slice(div_sbInd[sit]+1, div_sbInd[sit+1]).each(function(dit, del) {
                    var divFacs = $(mei).find("zone[xml\\:id=" + $(del).attr("facs") + "]")[0];
                    var d_bb = parseBoundingBox(divFacs);
                    if (displayZones) {
                        rendEng.outlineBoundingBox(d_bb, {fill: "yellow"});
                    }

                    var dType = $(del).attr("form");
                    var dModel = new Toe.Model.Division(dType);
                    dModel.setBoundingBox(d_bb);
                    dModel.setID($(del).attr("xml:id"));

                    // instantiate division view and controller
                    var dView = new Toe.View.DivisionView(rendEng);
                    var dCtrl = new Toe.Ctrl.DivisionController(dModel, dView);
        
                    // mount the division on the staff
                    sModel.addDivision(dModel);
    
                    console.log("division: " + dType);
                });

                // load custos for the system (if it exists)
                $(custosList).slice(custos_sbInd[sit]+1, custos_sbInd[sit+1]).each(function(cit, cel) {
                    var custosFacs = $(mei).find("zone[xml\\:id=" + $(cel).attr("facs") + "]")[0];
                    var c_bb = parseBoundingBox(custosFacs);
                    if (displayZones) {
                        rendEng.outlineBoundingBox(c_bb, {fill: "purple"});
                    }

                    // get pitch name and octave
                    var pname = $(cel).attr("pname");
                    var oct = parseInt($(cel).attr("oct"));

                    var cModel = new Toe.Model.Custos(pname, oct);
                    cModel.setBoundingBox(c_bb);
                    cModel.setID($(cel).attr("xml:id"));

                    // instantiate division view and controller
                    var cView = new Toe.View.CustosView(rendEng);
                    var cCtrl = new Toe.Ctrl.CustosController(cModel, cView);
        
                    // mount the custos on the staff
                    sModel.setCustos(cModel);
    
                    console.log("custos");
                });
            });
            rendEng.repaint();
        };

        // asynchronous function
        var loadGlyphs = function(rendEng) {
            console.log("loading SVG glyphs ...");

            // return deferred promise
            return $.get(settings.prefix+"/static/img/neumes_concat.svg", function(svg) {
                var glyphs = new Object();

                // for each glyph, load it into fabric
                $(svg).find("svg").each(function(it, el) {
                    // http://stackoverflow.com/questions/652763/jquery-object-to-string
                    var rawSVG = $("<lol>").append($(el).clone()).remove().html();
                    fabric.loadSVGFromString(rawSVG, function(objects) {
                        gID = $(el).find("path").attr("id");
                        glyphs[gID] = new Toe.Model.Glyph(gID, objects[0]);
                    });
                });
                rendEng.setGlyphs(glyphs);
            });
        };

        // asynchronous function
        var handleBackgroundImage = function(filename) {
            console.log("loading background image ...");
            var dfd = $.Deferred();

            if (settings.autoLoad && settings.backgroundImage) {
                fabric.Image.fromURL(settings.prefix+"/file/"+filename, function(img) {
                    if (img.width > settings.width) {
                        settings.width = img.width;
                    }
                    if (img.height > settings.height) {
                        settings.height = img.height;
                    }

                    dfd.resolve();
                });
            }
            else {
                // immediately resolve
                dfd.resolve();
            }

            // return promise
            return dfd.promise();
        };

        // asynchronous function
        var loadPage = function(fileName) {
            var dfd = $.Deferred();

            if (settings.autoLoad && settings.filename) {
                $.get(settings.prefix+"/file/"+fileName, function(data) {
                    console.log("loading MEI file ...");

                    // save mei data
                    mei = data;

                    dfd.resolve();
                });
            }
            else {
                // immediately resolve
                dfd.resolve();
            }

            // return promise
            return dfd.promise();
        };

        // handler for when asynchronous calls have been completed
        var loadSuccess = function() {
            // create page
            var page = new Toe.Model.Page();

            // add canvas element to the element tied to the jQuery plugin
            var canvas = $("<canvas>").attr("id", settings.canvasid);

            var canvasDims = [settings.width, settings.height];
            if (settings.autoLoad) {
                // derive canvas dimensions from mei facs
                canvasDims = page.calcDimensions($(mei).find("zone"));

                if (canvasDims[0] < settings.width) {
                    canvasDims[0] = settings.width;
                }
                if (canvasDims[1] < settings.height) {
                    canvasDims[1] = settings.height;
                }
            }
            page.setDimensions(canvasDims[0], canvasDims[1]);

            // make canvas dimensions the size of the page
            canvas.attr("width", page.width);
            canvas.attr("height", page.height);
            canvas.attr("style", "border: 4px black solid;");

            elem.prepend(canvas);

            var canvasOpts = {renderOnAddition: false};
            if (settings.backgroundImage) {
                $.extend(canvasOpts, {backgroundImage: settings.prefix+"/file/"+settings.backgroundImage,
                                      backgroundImageOpacity: settings.backgroundImageOpacity,
                                      backgroundImageStretch: false});

            }
            rendEng.setCanvas(new fabric.Canvas(settings.canvasid, canvasOpts));

            if (settings.debug) {
                // add FPS debug element
                var fpsDebug = $("<div>").attr("id", "fps");
                fpsDebug.attr("style", "color: red; font-size: 200%");
                elem.prepend(fpsDebug);

                rendEng.canvas.onFpsUpdate = function(fps) {
                    $(fpsDebug).html('FPS: ' + fps);
                };
            }

            /***************************
             * Instantiate MVC classes *
             ***************************/
            // VIEWS
            var pView = new Toe.View.PageView(rendEng);

            // CONTROLLERS
            var pCtrl = new Toe.Ctrl.PageController(page, pView);

            if (settings.autoLoad && mei) {
                loadMeiPage(settings.debug, page);
            }

            // instantiate appropriate GUI elements
            var gui = new Toe.View.GUI(settings.prefix, settings.filename, rendEng, page,
                                      {sldr_bgImgOpacity: settings.backgroundImage, 
                                       initBgImgOpacity: settings.backgroundImageOpacity});

            console.log("Load successful. Neon.js ready.");
            var runTime = new Date() - startTime;
            console.log("loadtime: " + runTime + "ms");
        };

        // Call the init function when this object is created.
        init();
    };

    $.fn.neon = function(options)
    {
        return this.each(function()
        {
            var element = $(this);

            // Return early if this element already has a plugin instance
            if (element.data('neon'))
            {
                return;
            }

            // pass options to plugin constructor
            var neon = new Neon(this, options);

            // Store plugin object in this element's data
            element.data('neon', neon);
        });
    };
})(jQuery);
