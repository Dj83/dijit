dojo.provide("dijit._PaletteMixin");

dojo.declare("dijit._PaletteMixin",
	null,
	{
	// summary:
	//		A keyboard accessible palette, for picking a color/emoticon/etc.
	// description:
	//		A mixin for a grid showing various entities, so the user can pick a certain entity.

	// defaultTimeout: Number
	//		Number of milliseconds before a held key or button becomes typematic
	defaultTimeout: 500,

	// timeoutChangeRate: Number
	//		Fraction of time used to change the typematic timer between events
	//		1.0 means that each typematic event fires at defaultTimeout intervals
	//		< 1.0 means that each typematic event fires at an increasing faster rate
	timeoutChangeRate: 0.90,

	// value: String
	//		Currently selected color/emoticon/etc.
	value: null,

	// _currentFocus: [private] DomNode
	//		The currently focused or hovered cell.
	//		Different from value, which represents the selected (i.e. clicked) cell.
	_currentFocus: 0,

	// _xDim: [protected] Integer
	//		This is the number of cells horizontally across.
/*=====
	_xDim: null,
=====*/

	// _yDim: [protected] Integer
	//		This is the number of cells vertically down.
/*=====
	_yDim: null,
=====*/

	// tabIndex: String
	//		Widget tab index.
	tabIndex: "0",

	// cellClass: [protected] String
	//		CSS class applied to each cell in the palette
	cellClass: "dijitPaletteCell",

	// highlightClass: [protected] String
	//		CSS class applied to the currently hovered/focused cell in the palette
	// TODO: w/new architecture I don't think we need to do this for focus anymore
	highlightClass: "dijitPaletteCellHighlight",

	// dyeClass: [protected] String
	//	 Name of javascript class for Object created for each cell of the palette.
	//	 dyeClass should implements dijit.Dye interface
	dyeClass: '',

	_preparePalette: function(choices, titles) {
		// summary:
		//		Subclass must call _preparePalette() from postCreate(), passing in the tooltip
		//		for each cell
		// choices: String[][]
		//		id's for each cell of the palette, used to create Dye JS object for each cell
		// titles: String[]
		//		Localized tooltip for each cell

		this._cells = [];
		var url = this._blankGif;
		
		var dyeClassObj = dojo.getObject(this.dyeClass);

		for(var row=0; row < choices.length; row++){
			var rowNode = dojo.create("tr", {tabIndex: "-1"}, this.gridNode);
			for(var col=0; col < choices[row].length; col++){
				var value = choices[row][col];
				if(value){
					var cellObject = new dyeClassObj(value);
					
					var cellNode = dojo.create("td", {
						"class": this.cellClass,
						tabIndex: "-1",
						title: titles[value]
					});

					// prepare cell inner structure
					cellObject.fillCell(cellNode, url);

					dojo.forEach(["Dijitclick", "MouseEnter", "MouseLeave", "Focus"], function(handler){
						this.connect(cellNode, "on" + handler.toLowerCase(), "_onCell" + handler);
					}, this);

					dojo.place(cellNode, rowNode);

					cellNode.index = this._cells.length;

					// save cell info into _cells
					this._cells.push({node:cellNode, dye:cellObject});
				}
			}
		}
		this._xDim = choices[0].length;
		this._yDim = choices.length;

		// Now set all events
		// The palette itself is navigated to with the tab key on the keyboard
		// Keyboard navigation within the Palette is with the arrow keys
		// Spacebar selects the cell.
		// For the up key the index is changed by negative the x dimension.

		var keyIncrementMap = {
			UP_ARROW: -this._xDim,
			// The down key the index is increase by the x dimension.
			DOWN_ARROW: this._xDim,
			// Right and left move the index by 1.
			RIGHT_ARROW: 1,
			LEFT_ARROW: -1
		};
		for(var key in keyIncrementMap){
			this._connects.push(
				dijit.typematic.addKeyListener(
					this.domNode,
					{charOrCode:dojo.keys[key], ctrlKey:false, altKey:false, shiftKey:false},
					this,
					function(){
						var increment = keyIncrementMap[key];
						return function(count){ this._navigateByKey(increment, count); };
					}(),
					this.timeoutChangeRate,
					this.defaultTimeout
				)
			);
		}
	},

	postCreate: function(){
		this.inherited(arguments);
		// Set initial navigable node.   At any point in time there's exactly one
		// cell with tabIndex != -1.   If focus is inside the palette then
		// focus is on that cell.
		// TODO: if we set aria info (for the current value) on the palette itself then can we avoid
		// having to focus each individual cell?
		this._currentFocus = this._cells[0].node;
		dojo.attr(this._currentFocus, "tabIndex", this.tabIndex);
	},

	focus: function(){
		// summary:
		//		Focus this widget.  Puts focus on the most recently focused cell.

		// The cell already has tabIndex set, just need to set CSS and focus it
		dojo.addClass(this._currentFocus, this.highlightClass);
		dijit.focus(this._currentFocus);
	},

	_onFocus: function(){
		// summary:
		//		Handler for when the widget gets focus (because a cell inside
		//		the palette got focus)
		// tags:
		//		protected

		dojo.addClass(this._currentFocus, this.highlightClass);
		this.inherited(arguments);
	},

	_onBlur: function(){
		// summary:
		//		Handler for when the widget loses focus
		// tags:
		//		protected

		// Just to be the same as 1.3, when I am focused again go to first (0,0) cell rather than
		// currently focused node.
		dojo.attr(this._currentFocus, "tabIndex", "-1");
		dojo.removeClass(this._currentFocus, this.highlightClass);
		this._currentFocus = this._cells[0].node;
		dojo.attr(this._currentFocus, "tabIndex", this.tabIndex);

		this.inherited(arguments);
	},

	_onCellDijitclick: function(/*Event*/ evt){
		// summary:
		//		Handler for click, enter key & space key. Selects the cell.
		// evt:
		//		The event.
		// tags:
		//		private

		var target = evt.currentTarget;
		this._selectCell(target);
		dojo.stopEvent(evt);
	},

	_onCellMouseEnter: function(/*Event*/ evt){
		// summary:
		//		Handler for onMouseEnter event on a cell. Put highlight on the cell under the mouse.
		// evt:
		//		The mouse event.
		// tags:
		//		private

		var target = evt.currentTarget;
		this._setCurrent(target);
	},

	_onCellMouseLeave: function(/*Event*/ evt){
		// summary:
		//		Handler for onMouseLeave event on a cell. Remove highlight on the cell under the mouse.
		// evt:
		//		The mouse event.
		// tags:
		//		private
		dojo.removeClass(this._currentFocus, this.highlightClass);
	},

	_onCellFocus: function(/*Event*/ evt){
		// summary:
		//		Handler for onFocus of a cell.
		// description:
		//		Removes highlight of the cell that just lost focus, and highlights
		//		the new cell.  Also moves the tabIndex setting to the new cell.
		//
		// evt:
		//		The focus event.
		// tags:
		//		private

		this._setCurrent(evt.currentTarget);
	},

	_setCurrent: function(/*Node*/ node){
		// summary:
		//		Called when a cell is hovered or focused.
		// description:
		//		Removes highlight of the old cell, and highlights
		//		the new cell.  Also moves the tabIndex setting to the new cell.
		// tags:
		//		protected
		if("_currentFocus" in this){
			// Remove highlight and tabIndex on old cell
			dojo.attr(this._currentFocus, "tabIndex", "-1");
			dojo.removeClass(this._currentFocus, this.highlightClass);
		}

		// Set highlight and tabIndex of new cell
		this._currentFocus = node;
		if(node){
			dojo.attr(node, "tabIndex", this.tabIndex);
			dojo.addClass(node, this.highlightClass);
		}
	},

	_selectCell: function(/*Node*/ cell){
		// summary:
		// 		Callback when user clicks a given cell (to select it).  Triggers the onChange event.
		// selectNode: DomNode
		//		the clicked cell
		// tags:
		//		protected
        var dye = this._getDye(cell);
		this.onChange(this.value = dye.getValue());
	},

	onChange: function(value){
		// summary:
		//		Callback when a cell is selected.
		// value: String
		//		Value corresponding to cell.
	},

	_navigateByKey: function(increment, typeCount){
		// summary:
		// 	  	This is the callback for typematic.
		// 		It changes the focus and the highlighed cell.
		// increment:
		// 		How much the key is navigated.
		// typeCount:
		//		How many times typematic has fired.
		// tags:
		//		private

		// typecount == -1 means the key is released.
		if(typeCount == -1){ return; }

		var newFocusIndex = this._currentFocus.index + increment;
		if(newFocusIndex < this._cells.length && newFocusIndex > -1){
			var focusNode = this._cells[newFocusIndex].node;
			this._setCurrent(focusNode);

			// Actually focus the node, for the benefit of screen readers.
			// Use setTimeout because IE doesn't like changing focus inside of an event handler
			setTimeout(dojo.hitch(dijit, "focus", focusNode), 0);
		}
	},

	_getDye: function(/*DomNode*/ cell){
		// summary:
		//		Get JS object for given cell DOMNode

		return this._cells[cell.index].dye;
	}
});

/*=====
dojo.declare("dijit.Dye",
	null,
	{
		// summary:
		//		Interface for the JS Object associated with a palette cell (i.e. DOMNode)

		constructor: function(alias){
			// summary:
			//		Initialize according to value or alias like "white"
			// alias: String
		},

		getValue: function(){
			// summary:
			//		Return "value" of cell; meaning of "value" varies by subclass.
			// description:
			//		For example color hex value, emoticon ascii value etc, entity hex value.
		},

		fillCell: function(cell, blankGif){
			// summary:
			//		Add cell DOMNode inner structure
			//	cell: DomNode
			//		The surrounding cell
			//	blankGif: String
			//		URL for blank cell image
		}
	}
);
=====*/