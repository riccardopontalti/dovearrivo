<!-- Hero illustration made for DoveArrivo: dusk sky and three stylised ridges lit by the
     alpenglow. Not a real mountain profile. Generated once by a seeded script; plain SVG. -->
<svg class="backdrop" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
	<defs>
		<linearGradient id="bd-sky" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#08111f" />
			<stop offset="0.45" stop-color="#12213a" />
			<stop offset="0.68" stop-color="#2d2a4a" />
			<stop offset="0.8" stop-color="#6b3f55" />
			<stop offset="0.9" stop-color="#c46a5a" />
		</linearGradient>
		<radialGradient id="bd-sun" cx="0.68" cy="0.74" r="0.55">
			<stop offset="0" stop-color="#ff9a62" stop-opacity="0.75" />
			<stop offset="0.35" stop-color="#ff9a62" stop-opacity="0.22" />
			<stop offset="1" stop-color="#ff9a62" stop-opacity="0" />
		</radialGradient>
		<linearGradient id="bd-rim" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0" stop-color="#ffd0a8" stop-opacity="0.15" />
			<stop offset="0.6" stop-color="#ffb38a" stop-opacity="0.9" />
			<stop offset="1" stop-color="#ff9a62" stop-opacity="0.3" />
		</linearGradient>
		<linearGradient id="bd-far" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#3b3354" />
			<stop offset="0.5" stop-color="#1c2640" />
		</linearGradient>
		<linearGradient id="bd-mid" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#1d2a45" />
			<stop offset="0.6" stop-color="#121e33" />
		</linearGradient>
	</defs>
	<rect width="1440" height="900" fill="url(#bd-sky)" />
	<rect class="sun" width="1440" height="900" fill="url(#bd-sun)" />
	<path d="M-20 640L25 620L52 598L86 587L127 543L162 513L200 479L227 475L267 460L289 465L322 477L364 532L399 539L438 570L474 568L519 567L548 535L578 534L606 516L635 503L670 525L715 573L742 574L777 582L802 561L824 560L854 524L900 476L924 454L953 435L984 428L1019 432L1046 444L1079 473L1117 505L1151 517L1190 498L1221 492L1249 488L1279 496L1310 498L1354 552L1397 591L1428 612L1451 602L1460 630L1460 900L-20 900Z" fill="url(#bd-far)" />
	<path class="rim" d="M-20 640L25 620L52 598L86 587L127 543L162 513L200 479L227 475L267 460L289 465L322 477L364 532L399 539L438 570L474 568L519 567L548 535L578 534L606 516L635 503L670 525L715 573L742 574L777 582L802 561L824 560L854 524L900 476L924 454L953 435L984 428L1019 432L1046 444L1079 473L1117 505L1151 517L1190 498L1221 492L1249 488L1279 496L1310 498L1354 552L1397 591L1428 612L1451 602L1460 630" fill="none" stroke="url(#bd-rim)" stroke-width="2" />
	<path d="M-20 685L0 676L30 660L68 617L104 600L141 604L164 629L187 641L204 642L226 653L253 667L275 666L298 673L334 660L362 641L399 596L437 584L474 572L512 578L544 607L566 628L596 656L630 667L662 682L680 690L717 679L750 645L767 635L803 616L841 620L868 638L901 639L926 659L952 645L982 645L1012 615L1037 594L1063 582L1087 550L1126 543L1162 545L1183 563L1203 581L1233 601L1270 636L1291 645L1312 643L1340 639L1369 626L1394 624L1411 636L1440 654L1460 710L1460 900L-20 900Z" fill="url(#bd-mid)" />
	<path d="M-20 799L-1 794L22 799L51 788L83 782L110 775L125 773L151 765L183 762L200 755L216 749L231 738L263 735L280 732L308 731L331 724L353 733L383 744L405 756L424 754L457 772L489 774L506 780L532 781L548 779L575 772L598 763L614 766L634 766L649 757L665 755L697 741L726 740L757 732L787 737L812 744L835 747L858 751L887 757L913 762L945 765L978 771L1002 763L1035 762L1051 757L1082 740L1111 725L1140 722L1159 709L1176 704L1205 706L1233 711L1256 714L1282 724L1301 735L1324 749L1342 756L1361 760L1391 778L1418 779L1435 790L1460 790L1460 900L-20 900Z" fill="#0b1523" />
</svg>

<style>
	.backdrop {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
	}
	.sun {
		animation: rise 1600ms var(--ease) both;
	}
	.rim {
		stroke-dasharray: 2400;
		animation: draw 2200ms 200ms var(--ease) both;
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(40px);
		}
	}
	@keyframes draw {
		from {
			stroke-dashoffset: 2400;
		}
		to {
			stroke-dashoffset: 0;
		}
	}
</style>
