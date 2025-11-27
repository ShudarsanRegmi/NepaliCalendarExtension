$(document).ready(function() {

	$("#convert").click(function(){
		var datefield = $("#datefield").val();
		var convert_option = $("select#convert_option").val();
		if(datefield==''){$("#result_display").html("Please enter date");return false;}
		$.post('getMethod.php',{actionName:'dconverter','datefield':datefield,'convert_option':convert_option,state:Math.random()},function(data){
			$("#result_display").html(data);
		});
	});


	// ------------ CUSTOM SCROLL  ------------ //
	var nice = //$("html").niceScroll();  // The document page (body)
	$(".nav-scroll").niceScroll({cursorborder:"",cursorcolor:"#de4249",boxzoom:false,touchbehavior:false}); // Menu scrollable DIV
    $(".scroll").niceScroll({cursorborder:"",cursorcolor:"#DE4249",boxzoom:false,touchbehavior:false}); // Upcoming Days scrollable DIV
	
	// ------------ RESPONSIVE MENU SHOW / HIDE FUNCTION ------------ //
	$('#menu').hide();
	$('#nav_btn').click(function() {
	  $('#menu').is(":hidden") ? $('#menu').slideDown("fast") : $('#menu').slideUp("fast");
	  return false;
	});
	

	// ------------ CALENDAR  POPUP BOX ------------ //
	// hides the slickbox as soon as the DOM is ready
	$('.popup-box').hide();

	

	// shows the slickbox on clicking the noted link  
	$('.dates li').click(function() {
		if($(this).children('div.popup-box').is(":hidden")){
			$('.popup-box').slideUp('fast');
			$(this).children('div.popup-box').slideDown('fast');
			
		} else { 

		}
		return false;
	});
	$('.notesWithday').click(function() {
        $('.popup-box').slideUp('fast');
        $(this).children('div.popup-box').slideDown('fast');

	});
	
	// hides the slickbox on clicking the noted link  
	
	$('.popup-close').click(function() {
		$('.popup-box').slideUp('fast');
		return false;
	});

	// ------------ RASHIFAL DROPDOWN ------------ //
	
	$('.sortby-btn span').click(function() {
		$('.sortby-child').show();
		$(document).bind('focusin.sortby-child click.sortby-child',function(e) {
			if ($(e.target).closest('.sortby-chile,.sortby-btn span').length) return;
			//$(document).unbind('.sortby-btn span');
			$('.sortby-child').fadeOut('medium');
		});
	});




});



