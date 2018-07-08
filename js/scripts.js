var dangerZone = [
    {top: 190, left: 200},
    {top: 190, left: 210},
    {top: 190, left: 220},
    {top: 190, left: 220},
    {top: 200, left: 220},
    {top: 220, left: 220},
    {top: 230, left: 220},
    {top: 230, left: 210},
    {top: 230, left: 200},
    {top: 230, left: 190},
    {top: 220, left: 190},
    {top: 210, left: 190},
    {top: 200, left: 190},
    {top: 190, left: 190},





];
var step = 10;
var user = $('.user');

var LEFT = 37;
var UP = 38;
var RIGHT = 39;
var DOWN = 40;
var help = {
    create_block: function(e) {
        
    },

    current_block: function(offset) {
        var c_top = offset.top; //205
        var c_left = offset.left; //205
        var block_steps = [];
        $.each(dangerZone, function( index, value ) {
            if (value.top == c_top + step && value.left == c_left) block_steps.push(DOWN);
            if (value.top == c_top - step && value.left == c_left) block_steps.push(UP);
            if (value.top == c_top && value.left == c_left + step) block_steps.push(RIGHT);
            if (value.top == c_top && value.left == c_left - step) block_steps.push(LEFT);
        });
        return block_steps;
    },

    draw_blocks: function() {
        $.each(dangerZone, function( index, value ) {
            var block = $('<div>', {class: 'block'});
            block.offset(value);
            $('.start').append(block);
        });
    }
};


$(document).ready(function() {
    help.draw_blocks();
    $(document).keydown(function(e){
        var offset = user.offset();
        var current_block = help.current_block(offset);
        if (e.keyCode == LEFT && !current_block.includes(LEFT)) {
            user.offset({ top: offset.top, left: offset.left - step });
        } else if (e.keyCode == UP && !current_block.includes(UP)) {
            user.offset({ top: offset.top - step, left: offset.left });
        } else if (e.keyCode == RIGHT && !current_block.includes(RIGHT)) {
            user.offset({ top: offset.top, left: offset.left + step });
        } else if (e.keyCode == DOWN && !current_block.includes(DOWN)) {
            user.offset({ top: offset.top + step, left: offset.left });
        } 
    });
});
