  //Today Class ---------------------------------------------------------
  // Define a verticle column that shows the 24 hour period of 'today' in the view.
  var Today = function(xScale){
      this.refresh(xScale);
  };
  Today.prototype.refresh = function(xScale) {
    var timeOffset = -8;
      this._xScale = xScale;
      this._begin = new Date();
      this._begin.setHours(timeOffset,0,0,0);
      this._end = new Date();
      this._end.setHours(timeOffset + 24,0,0,0);
      this.x = this._xScale(this._begin);
      this.width = this._xScale(this._end) - this._xScale(this._begin);
      return this;
  };
  
