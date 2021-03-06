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

/**
 * Creates a new staff controller and listens to the model and the view
 *
 * @class Controller for the staff
 * @param {Toe.Model.Staff} pModel The staff model
 * @param {Toe.View.Staff} pView The staff view
 */
Toe.Ctrl.StaffController = function(sModel, sView) {
    // LISTEN TO THE VIEW

    // LISTEN TO THE MODEL
    /** 
     * @event
     * event type: vRenderStaff
     * @param {Toe.Model.Staff} staff Staff to render
     */
    $(sModel).bind("vRenderStaff", function(event, staff) {
        sView.renderStaff(staff);
    });
}

Toe.Ctrl.StaffController.prototype.constructor = Toe.Ctrl.StaffController;
